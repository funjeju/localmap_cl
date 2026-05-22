import * as geofire from 'geofire-common';

export function calculateGeoHash(lat: number, lng: number) {
  return geofire.geohashForLocation([lat, lng]);
}

export function calculateGeoHashBounds(center: [number, number], radiusInM: number) {
  return geofire.geohashQueryBounds(center, radiusInM);
}
