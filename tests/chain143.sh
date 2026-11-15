#!/bin/sh
cd "$(dirname "$0")"
for t in social v1143e sec143; do
  timeout 1500 node $t.mjs > out-$t.txt 2>&1
  echo "$t exit=$? $(grep -o "failures [0-9]*" out-$t.txt | tail -1) $(grep -o "errors \[.*" out-$t.txt | tail -1 | cut -c1-100)"
done
echo CHAIN-DONE
