import * as migration_20260528_232600 from './20260528_232600';
import * as migration_20260530_062122_payload_seo_meta from './20260530_062122_payload_seo_meta';

export const migrations = [
  {
    up: migration_20260528_232600.up,
    down: migration_20260528_232600.down,
    name: '20260528_232600',
  },
  {
    up: migration_20260530_062122_payload_seo_meta.up,
    down: migration_20260530_062122_payload_seo_meta.down,
    name: '20260530_062122_payload_seo_meta'
  },
];
