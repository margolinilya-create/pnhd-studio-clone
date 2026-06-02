import * as migration_20260528_232600 from './20260528_232600';
import * as migration_20260530_062122_payload_seo_meta from './20260530_062122_payload_seo_meta';
import * as migration_20260530_064450_payload_redirects from './20260530_064450_payload_redirects';
import * as migration_20260530_071720_order_customer_note from './20260530_071720_order_customer_note';
import * as migration_20260530_075057_pages_drafts_versions from './20260530_075057_pages_drafts_versions';
import * as migration_20260601_101348_payload_plugin_import_export from './20260601_101348_payload_plugin_import_export';
import * as migration_20260601_102621_payload_plugin_form_builder from './20260601_102621_payload_plugin_form_builder';
import * as migration_20260601_110001_payload_form_submissions_extra_fields from './20260601_110001_payload_form_submissions_extra_fields';
import * as migration_20260601_203622_site_settings_global from './20260601_203622_site_settings_global';
import * as migration_20260601_210348_navigation_global from './20260601_210348_navigation_global';
import * as migration_20260601_210820_cookie_bar_global from './20260601_210820_cookie_bar_global';
import * as migration_20260601_221521_site_settings_contacts_geo from './20260601_221521_site_settings_contacts_geo';
import * as migration_20260601_231406_checkout_messages_global from './20260601_231406_checkout_messages_global';
import * as migration_20260601_232405_pages_static_extensions from './20260601_232405_pages_static_extensions';
import * as migration_20260601_233401_categories_marketing_fields from './20260601_233401_categories_marketing_fields';
import * as migration_20260601_235104_homepage_global from './20260601_235104_homepage_global';
import * as migration_20260602_065255_print_content_collections from './20260602_065255_print_content_collections';
import * as migration_20260602_075410_wave1_trust_badges from './20260602_075410_wave1_trust_badges';
import * as migration_20260602_221453_empty_states_and_404_copy from './20260602_221453_empty_states_and_404_copy';

export const migrations = [
  {
    up: migration_20260528_232600.up,
    down: migration_20260528_232600.down,
    name: '20260528_232600',
  },
  {
    up: migration_20260530_062122_payload_seo_meta.up,
    down: migration_20260530_062122_payload_seo_meta.down,
    name: '20260530_062122_payload_seo_meta',
  },
  {
    up: migration_20260530_064450_payload_redirects.up,
    down: migration_20260530_064450_payload_redirects.down,
    name: '20260530_064450_payload_redirects',
  },
  {
    up: migration_20260530_071720_order_customer_note.up,
    down: migration_20260530_071720_order_customer_note.down,
    name: '20260530_071720_order_customer_note',
  },
  {
    up: migration_20260530_075057_pages_drafts_versions.up,
    down: migration_20260530_075057_pages_drafts_versions.down,
    name: '20260530_075057_pages_drafts_versions',
  },
  {
    up: migration_20260601_101348_payload_plugin_import_export.up,
    down: migration_20260601_101348_payload_plugin_import_export.down,
    name: '20260601_101348_payload_plugin_import_export',
  },
  {
    up: migration_20260601_102621_payload_plugin_form_builder.up,
    down: migration_20260601_102621_payload_plugin_form_builder.down,
    name: '20260601_102621_payload_plugin_form_builder',
  },
  {
    up: migration_20260601_110001_payload_form_submissions_extra_fields.up,
    down: migration_20260601_110001_payload_form_submissions_extra_fields.down,
    name: '20260601_110001_payload_form_submissions_extra_fields',
  },
  {
    up: migration_20260601_203622_site_settings_global.up,
    down: migration_20260601_203622_site_settings_global.down,
    name: '20260601_203622_site_settings_global',
  },
  {
    up: migration_20260601_210348_navigation_global.up,
    down: migration_20260601_210348_navigation_global.down,
    name: '20260601_210348_navigation_global',
  },
  {
    up: migration_20260601_210820_cookie_bar_global.up,
    down: migration_20260601_210820_cookie_bar_global.down,
    name: '20260601_210820_cookie_bar_global',
  },
  {
    up: migration_20260601_221521_site_settings_contacts_geo.up,
    down: migration_20260601_221521_site_settings_contacts_geo.down,
    name: '20260601_221521_site_settings_contacts_geo',
  },
  {
    up: migration_20260601_231406_checkout_messages_global.up,
    down: migration_20260601_231406_checkout_messages_global.down,
    name: '20260601_231406_checkout_messages_global',
  },
  {
    up: migration_20260601_232405_pages_static_extensions.up,
    down: migration_20260601_232405_pages_static_extensions.down,
    name: '20260601_232405_pages_static_extensions',
  },
  {
    up: migration_20260601_233401_categories_marketing_fields.up,
    down: migration_20260601_233401_categories_marketing_fields.down,
    name: '20260601_233401_categories_marketing_fields',
  },
  {
    up: migration_20260601_235104_homepage_global.up,
    down: migration_20260601_235104_homepage_global.down,
    name: '20260601_235104_homepage_global',
  },
  {
    up: migration_20260602_065255_print_content_collections.up,
    down: migration_20260602_065255_print_content_collections.down,
    name: '20260602_065255_print_content_collections',
  },
  {
    up: migration_20260602_075410_wave1_trust_badges.up,
    down: migration_20260602_075410_wave1_trust_badges.down,
    name: '20260602_075410_wave1_trust_badges',
  },
  {
    up: migration_20260602_221453_empty_states_and_404_copy.up,
    down: migration_20260602_221453_empty_states_and_404_copy.down,
    name: '20260602_221453_empty_states_and_404_copy'
  },
];
