#!/usr/bin/env bash
# verify_node.sh <node>  — the five tools on a node door, on the wire. ORDER-008 (CEO 2026-09-14): the door of record is the short root
# <cc>.fo-kg.ai/mcp; the long name <node>.familyofficeknowledgegraph.ai/mcp keeps answering and is probed once (get_record) at the end.
# Prints one line per tool, then the long-name line, then the surface counts.
n="$1"; cc="${n%%-*}"; H="$cc.fo-kg.ai"; HL="$n.familyofficeknowledgegraph.ai"; J='-H content-type:application/json'
cd "$(dirname "$0")/../public" || exit 1
ID=$(python -c "import json; print(json.load(open('records/$n/index.json',encoding='utf-8'))['records'][0]['id'])")
curl -s -D - -o /dev/null "https://$H/mcp" | grep -i "^HTTP\|^x-office-node\|^x-office-version" | tr '\n' ' '; echo
for call in "{\"name\":\"get_record\",\"arguments\":{\"identifier\":\"$ID\"}}" "{\"name\":\"resolve_family_office\",\"arguments\":{\"identifier\":\"$ID\"}}" "{\"name\":\"list_events_since\",\"arguments\":{\"identifier\":\"$ID\",\"limit\":2}}" "{\"name\":\"list_aliases\",\"arguments\":{\"identifier\":\"$ID\"}}" "{\"name\":\"list_nodes\",\"arguments\":{}}"; do
  curl -s $J -X POST "https://$H/mcp" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":$call}" | python -c "
import sys,json; d=json.load(sys.stdin); r=d['result']; sc=r.get('structuredContent',{})
if r.get('isError'): print('ERR',sc)
elif 'record' in sc: print('get_record', sc['record']['id'], sc['record']['identity']['legal_name']['value'][:40], sc['served_by']['via'])
elif 'matches' in sc: print('resolve', [(m['id'],m['node'],m['matched_on']) for m in sc['matches']][:2])
elif 'events' in sc: print('events', len(sc['events']), sc.get('next_cursor'))
elif 'aliases' in sc: print('aliases', sc['id'], len(sc['aliases']))
elif 'nodes' in sc: print('nodes', [(x['id'],x['records'],x.get('door','').replace('https://','')) for x in sc['nodes']])"
done
curl -s --resolve "$HL:443:104.21.68.134" $J -X POST "https://$HL/mcp" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_record\",\"arguments\":{\"identifier\":\"$ID\"}}}" | python -c "
import sys,json; d=json.load(sys.stdin); r=d['result']; sc=r.get('structuredContent',{}); print('long name', '$HL', 'answers get_record', sc['record']['id'] if 'record' in sc else ('ERR', sc))"
curl -s https://familyofficeknowledgegraph.ai/facts.json | python -c "import sys,json; d=json.load(sys.stdin); c=d['radar']['counts']; print('surface', d['surface_version'], {k:c[k] for k in ('records','nodes','fields','confirmed','filled','conflict','gaps')})"
