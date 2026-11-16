//! Secrets in the macOS login keychain: connection passwords and the app passphrase (as a salted
//! PBKDF2 hash). Items are generic passwords under service "ypacapy", marked not synchronizable, so
//! iCloud Keychain never copies them off this Mac. Nothing secret is ever written to a file.

const SERVICE: &str = "ypacapy";
const PASSPHRASE: &str = "app-passphrase";
const ITERATIONS: u32 = 210_000;

pub fn conn_account(id: &str) -> String {
    format!("connection:{id}")
}

#[cfg(target_os = "macos")]
mod imp {
    use security_framework::passwords::{delete_generic_password_options, generic_password, set_generic_password_options, PasswordOptions};

    /// errSecItemNotFound
    const NOT_FOUND: i32 = -25300;

    fn opts(account: &str) -> PasswordOptions {
        let mut o = PasswordOptions::new_generic_password(super::SERVICE, account);
        // this device only: never an iCloud Keychain item
        o.set_access_synchronized(Some(false));
        o
    }

    pub fn set(account: &str, secret: &[u8]) -> Result<(), String> {
        set_generic_password_options(secret, opts(account)).map_err(|e| format!("Keychain: {e}"))
    }

    pub fn get(account: &str) -> Result<Option<Vec<u8>>, String> {
        match generic_password(opts(account)) {
            Ok(v) => Ok(Some(v)),
            Err(e) if e.code() == NOT_FOUND => Ok(None),
            Err(e) => Err(format!("Keychain: {e}")),
        }
    }

    pub fn delete(account: &str) -> Result<(), String> {
        match delete_generic_password_options(opts(account)) {
            Ok(()) => Ok(()),
            Err(e) if e.code() == NOT_FOUND => Ok(()),
            Err(e) => Err(format!("Keychain: {e}")),
        }
    }
}

#[cfg(not(target_os = "macos"))]
mod imp {
    pub fn set(_: &str, _: &[u8]) -> Result<(), String> {
        Err("the keychain is only available on macOS".into())
    }
    pub fn get(_: &str) -> Result<Option<Vec<u8>>, String> {
        Ok(None)
    }
    pub fn delete(_: &str) -> Result<(), String> {
        Ok(())
    }
}

pub use imp::{delete, get, set};

pub fn get_string(account: &str) -> Result<Option<String>, String> {
    Ok(get(account)?.map(|b| String::from_utf8_lossy(&b).into_owned()))
}

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}

fn unhex(s: &str) -> Option<Vec<u8>> {
    (0..s.len()).step_by(2).map(|i| s.get(i..i + 2).and_then(|h| u8::from_str_radix(h, 16).ok())).collect()
}

fn derive(pass: &str, salt: &[u8], iterations: u32) -> [u8; 32] {
    pbkdf2::pbkdf2_hmac_array::<sha2::Sha256, 32>(pass.as_bytes(), salt, iterations)
}

pub fn has_passphrase() -> Result<bool, String> {
    Ok(get(PASSPHRASE)?.is_some())
}

pub fn set_passphrase(pass: &str) -> Result<(), String> {
    let mut salt = [0u8; 16];
    getrandom::fill(&mut salt).map_err(|e| format!("no random source: {e}"))?;
    let record = format!("pbkdf2-sha256${ITERATIONS}${}${}", hex(&salt), hex(&derive(pass, &salt, ITERATIONS)));
    set(PASSPHRASE, record.as_bytes())
}

pub fn clear_passphrase() -> Result<(), String> {
    delete(PASSPHRASE)
}

/// Whether `pass` is the passphrase. Err when none is set or the stored record is unreadable.
pub fn check_passphrase(pass: &str) -> Result<bool, String> {
    let rec = get_string(PASSPHRASE)?.ok_or("No passphrase is set")?;
    let parts: Vec<&str> = rec.split('$').collect();
    let [kind, iter, salt, hash] = parts[..] else { return Err("The stored passphrase is unreadable".into()) };
    let (Ok(iter), Some(salt), Some(hash)) = (iter.parse::<u32>(), unhex(salt), unhex(hash)) else {
        return Err("The stored passphrase is unreadable".into());
    };
    if kind != "pbkdf2-sha256" || hash.len() != 32 {
        return Err("The stored passphrase is unreadable".into());
    }
    let got = derive(pass, &salt, iter);
    // constant time
    Ok(got.iter().zip(hash.iter()).fold(0u8, |acc, (a, b)| acc | (a ^ b)) == 0)
}

#[cfg(test)]
mod tests {
    /// Touches the login keychain (adds, reads and removes one item): run with `cargo test -- --ignored`.
    #[test]
    #[ignore]
    fn keychain_roundtrip() {
        let account = "test-roundtrip";
        super::set(account, b"secret").unwrap();
        assert_eq!(super::get(account).unwrap().as_deref(), Some(&b"secret"[..]));
        super::delete(account).unwrap();
        assert_eq!(super::get(account).unwrap(), None);
    }

    #[test]
    fn hex_roundtrip() {
        let b = [0u8, 1, 0xab, 0xff];
        assert_eq!(super::unhex(&super::hex(&b)).unwrap(), b);
    }
}
