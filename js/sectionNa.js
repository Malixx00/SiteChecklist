// Reason copy for declaring a section not applicable.
//
// Presets exist so the common cases are one tap on a tablet with gloves on,
// and so the same situation is worded the same way across every technician's
// report. Anything unusual still goes in as free text.

/** Applies to any section, so it stays correct if the survey gains new ones. */
const GENERIC = [
  'Not accessible on this visit',
  'Unable to complete safely',
  'Insufficient time on site',
];

/** Used when a section has no equipment-specific wording of its own. */
const NOT_FITTED = 'Not fitted to this turntable';

/** Section id -> the reasons that actually come up on the tools. */
const BY_SECTION = {
  sensors_and_home_position: ['No sensors fitted to this turntable'],
  remote_controls: ['No remote controls fitted to this turntable'],
  load_test_using_vehicle: [
    'No suitable vehicle available',
    'Client authorisation not given',
    'Unsafe test conditions',
  ],
};

/** Preset reasons for a section, most specific first. */
export function reasonsFor(sectionId) {
  const specific = BY_SECTION[sectionId] ?? [NOT_FITTED];
  return [...specific, ...GENERIC.filter((r) => !specific.includes(r))];
}
