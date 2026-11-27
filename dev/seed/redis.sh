#!/usr/bin/env bash
# ypacapy dummy data: Redis 6.2+
#
#   bash dev/seed/redis.sh                      # localhost:6379
#   bash dev/seed/redis.sh -h host -p 6380 -a pass
#
# Any arguments go straight to redis-cli. Safe to re-run: it first deletes every key
# matching capy:*, capy/* or capy.* in databases 0 and 1, then writes them again.
# Other keys are not touched.

set -euo pipefail
command -v redis-cli >/dev/null || { echo "redis-cli not found" >&2; exit 1; }

# rc DB: send the heredoc to redis-cli on database DB, print only errors.
rc() {
  local out
  out=$(redis-cli "$@" 2>&1) || { echo "$out" >&2; exit 1; }
  if grep -E '^(ERR|WRONGTYPE|NOPERM|Could not connect)' <<<"$out" >&2; then exit 1; fi
}
ARGS=("$@")
db() { rc ${ARGS[@]+"${ARGS[@]}"} -n "$1"; }

for n in 0 1; do
db "$n" <<'EOF'
EVAL "local n=0 for _,p in ipairs(ARGV) do local c='0' repeat local r=redis.call('SCAN',c,'MATCH',p,'COUNT',1000) c=r[1] for _,k in ipairs(r[2]) do redis.call('DEL',k) n=n+1 end until c=='0' end return n" 0 capy:* capy/* capy.*
EOF
done

# ── Strings: plain, JSON (compact and pretty, with a number past 2^64), counters,
#    raw bytes (shown as \xHH, locked for editing), empty, unicode, and one over 1 MB (locked).
db 0 <<'EOF'
SET capy:config:name "ypacapy"
SET capy:config:json "{\"name\":\"Bean\",\"weight_kg\":42.5,\"big\":12345678901234567890,\"tiny\":0.1000000000000000055511151231257827,\"likes\":[\"oranges\",\"baths\"],\"vaccinated\":false,\"mother\":null}"
SET capy:config:pretty "{\n  \"habitat\": \"Mud Spa\",\n  \"pool\": true,\n  \"temps\": [38.5, 39, 40.25]\n}"
SET capy:config:not_json "{this is not json"
SET capy:counter:visits 41
INCR capy:counter:visits
SET capy:counter:float 3.14
SET capy:bytes:png "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
SET capy:bytes:mixed "ok\xff\xfe\x00end"
SET capy:empty ""
SET capy:unicode "カピバラ 🦫 مرحبا"
SET "capy:with space" "key name has a space"
SET "capy:カピバラ:🦫" "unicode key name"
SET capy::double "empty folder segment"
SET capy:a:b:c:d:e:deep "five folders down"
SET capy/slash/style/key "for a / separator"
SET capy.dot.style.key "for a . separator"
EVAL "redis.call('SET', KEYS[1], string.rep('capybara ', 125000)) return redis.call('STRLEN', KEYS[1])" 1 capy:big:string
SETBIT capy:bitmap:days 1 1
SETBIT capy:bitmap:days 5 1
SETBIT capy:bitmap:days 100 1
PFADD capy:hll:visitors ana budi chen dewi emeka fatima gus hana
EOF

# ── Expiring keys: the sidebar timer, EXPIRE and PERSIST from the key tab.
db 0 <<'EOF'
SET capy:session:long "expires in a week" EX 604800
SET capy:session:day "expires in a day" EX 86400
SET capy:session:hour "expires in an hour" EX 3600
SET capy:session:soon "expires in 10 minutes" EX 600
SET capy:session:forever "no expiry"
EOF

# ── Hashes: 60 capybaras (one folder), one with JSON values, one with 2,000 fields for HSCAN paging.
db 0 <<'EOF'
EVAL "local names={'Bean','Mochi','Pickle','Nugget','Tofu','Waffle','Biscuit','Pudding','Noodle','Dumpling','Churro','Maple'} local moods={'chill','sleepy','hungry','zoomies','grumpy'} for i=1,60 do local k='capy:capybara:'..i local nm=names[(i-1)%12+1] if i>12 then nm=nm..' '..(math.floor((i-1)/12)+1) end redis.call('HSET',k,'name',nm,'mood',moods[i%5+1],'weight_kg',tostring(35+(i*37%300)/10),'habitat',tostring(i%5+1),'vaccinated',(i%3==1) and 'true' or 'false') if i%4==0 then redis.call('HSET',k,'bio','Professional napper #'..i) end if i%10==0 then redis.call('EXPIRE',k,86400*30) end end return 60" 0
HSET capy:habitat:mud-spa name "Mud Spa" biome wetland area_m2 1250.50 has_pool true location "{\"lat\":-6.2088,\"lng\":106.8456}" keepers "[\"Ana\",\"Budi\"]"
HSET capy:hash:edge "" "empty field name" "empty value" "" "field with space" "v" "カピバラ" "🦫" "json" "{\"a\":1}" "bytes" "\xff\x00"
EVAL "for i=1,2000 do redis.call('HSET',KEYS[1],string.format('field:%04d',i),'value '..i) end return redis.call('HLEN',KEYS[1])" 1 capy:big:hash
EOF

# ── Lists, sets, sorted sets (incl. geo), streams.
db 0 <<'EOF'
RPUSH capy:list:small "first" "second" "third" "" "カピバラ" "{\"json\":true}"
EVAL "for i=1,500 do redis.call('RPUSH',KEYS[1],'feed capy '..(i%60+1)..' at slot '..i) end return redis.call('LLEN',KEYS[1])" 1 capy:queue:feedings
SADD capy:tags:all friendly swimmer napper "escape artist" "orange thief" vocal
EVAL "for i=1,1500 do redis.call('SADD',KEYS[1],'member:'..i) end return redis.call('SCARD',KEYS[1])" 1 capy:big:set
ZADD capy:leaderboard:naps 98 Bean 87.5 Mochi 120 Pickle 0 Nugget -5 Tofu 1e10 Waffle
EVAL "for i=1,1000 do redis.call('ZADD',KEYS[1],(i*37)%1000,'player:'..i) end return redis.call('ZCARD',KEYS[1])" 1 capy:big:zset
GEOADD capy:geo:habitats 106.8456 -6.2088 "Mud Spa" 106.8500 -6.2100 "Lazy River" 106.8400 -6.2000 "Hot Springs"
EVAL "local kinds={'login','logout','feed','bath','nap','escape','photo','purchase'} for i=1,300 do redis.call('XADD',KEYS[1],'*','kind',kinds[i%8+1],'seq',tostring(i),'actor','user_'..(i%33)) end return redis.call('XLEN',KEYS[1])" 1 capy:stream:events
XADD capy:stream:small * hello world
XGROUP CREATE capy:stream:events keepers 0
EOF

# ── 3,000 plain keys: more than one SCAN batch (about 1,000), so Scan more shows up.
db 0 <<'EOF'
EVAL "for i=1,3000 do redis.call('SET',string.format('capy:bulk:%04d',i),'value '..i) end return 3000" 0
EOF

# ── Throwaway keys for the write guard: DEL, UNLINK, RENAME, EXPIRE, and the KEYS ask.
db 0 <<'EOF'
EVAL "for i=1,50 do redis.call('SET','capy:scratch:'..i,'delete me') end return 50" 0
HSET capy:scratch:hash a 1 b 2 c 3
RPUSH capy:scratch:list x y z
EOF

# ── Database 1: the database number on the connection.
db 1 <<'EOF'
SET capy:db1:hello "you are on database 1"
HSET capy:db1:capybara name "Bean (db1)" mood chill
RPUSH capy:db1:list a b c
EOF

echo "db0: $(redis-cli ${ARGS[@]+"${ARGS[@]}"} -n 0 EVAL "local n=0 local c='0' repeat local r=redis.call('SCAN',c,'MATCH','capy*','COUNT',1000) c=r[1] n=n+#r[2] until c=='0' return n" 0) capy keys"
echo "db1: $(redis-cli ${ARGS[@]+"${ARGS[@]}"} -n 1 EVAL "local n=0 local c='0' repeat local r=redis.call('SCAN',c,'MATCH','capy*','COUNT',1000) c=r[1] n=n+#r[2] until c=='0' return n" 0) capy keys"
