#!/bin/bash
# Géocode en continu à mesure que de nouveaux lots d'annotation arrivent (cache => reprise).
# Arrêt : créer scripts/geo/work/STOP.
cd "$(dirname "$0")/../.."
while [ ! -f scripts/geo/work/STOP ]; do
  python3 -I scripts/geo/11_geocode.py >> scripts/geo/work/geocode_loop.log 2>&1
  sleep 120
done
