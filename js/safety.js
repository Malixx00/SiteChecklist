// The mandatory Take 5 safety section.
// Port of com.sitereporter.domain.SafetySection.
//
// This is NOT stored in the database and is NOT part of the import/export
// spreadsheet. It is prepended to every survey by state.js so it always
// appears first and must always be completed.

import { question } from './logic.js';

export const SAFETY_SECTION_ID = 'safety';

export function buildSafetySection(surveyId) {
  let so = 0;
  const base = { surveyId, section: SAFETY_SECTION_ID };

  const head = (id, title, description = null) =>
    question({ ...base, id, sortOrder: so++, isHeading: true, title, description,
      yesButton: false, noButton: false, commentsShown: false });

  const std = (id, title, description = null, photo = false, optional = false) =>
    question({ ...base, id, sortOrder: so++, title, description,
      yesButton: true, yesText: 'Done', noButton: true, noText: 'N/A',
      photoRequired: photo, commentsShown: true, isOptional: optional });

  const doneOnly = (id, title, description = null, commentsLabel = 'Note', optional = false) =>
    question({ ...base, id, sortOrder: so++, title, description,
      yesButton: true, yesText: 'Done', noButton: false,
      commentsShown: true, commentsLabel, isOptional: optional });

  const tick = (id, title, optional = true) =>
    question({ ...base, id, sortOrder: so++, title,
      yesButton: false, noButton: false, checkboxes: true,
      commentsShown: false, isOptional: optional });

  const yesNo = (id, title) =>
    question({ ...base, id, sortOrder: so++, title,
      yesButton: true, yesText: 'Yes', noButton: true, noText: 'No', commentsShown: true });

  const signOff = (id) =>
    question({ ...base, id, sortOrder: so++, title: 'Sign-Off', isSignOff: true,
      yesButton: false, noButton: false, commentsShown: false });

  const questions = [
    head('safety_h_instructions', 'Instructions',
      'This checklist MUST be completed by technicians prior to commencing turntable service or repair work.\n\n' +
      'Absolute Rules:\n' +
      '\u2022 No servicing with live traffic, ever.\n' +
      '\u2022 No reliance on signage alone \u2014 physical barriers required.\n' +
      '\u2022 No work without isolation, including BMS and remote systems.\n' +
      '\u2022 No assumption that others know you are there.\n' +
      '\u2022 Technician has authority to stop the job at any time because of safety concerns and seek immediate guidance from Team Leader or Manager.'),
    doneOnly('safety_q_address', 'Site address confirmed',
      'Record the service/repair site address in the note field before proceeding.', 'Address'),

    head('safety_h_step1', 'Step 1 \u2013 Stop & Survey'),
    doneOnly('safety_s1_q1', 'I understand the task I am about to perform'),
    doneOnly('safety_s1_q2', 'I have reviewed site conditions', 'Weather, lighting, noise, visibility'),
    doneOnly('safety_s1_q3', 'I know who the site contact / supervisor is', null, 'Note', true),

    head('safety_h_step2', 'Step 2 \u2013 Identify Key Hazards', 'Tick all hazards that apply to this site.'),
    head('safety_h_vehicle', 'Vehicle & Mobile Plant'),
    tick('safety_s2_q1', 'Cars / residents accessing area'),
    tick('safety_s2_q2', 'Trucks reversing or loading'),
    tick('safety_s2_q3', 'Forklifts / mobile plant'),
    tick('safety_s2_q4', 'Public or unauthorised pedestrians'),
    head('safety_h_turntable_hazards', 'Turntable-Specific Hazards'),
    tick('safety_s2_q5', 'Stored mechanical energy (rotation, momentum)'),
    tick('safety_s2_q6', 'Electrical energy'),
    tick('safety_s2_q7', 'Confined or restricted access'),
    tick('safety_s2_q8', 'Crushing / shearing points'),
    tick('safety_s2_q9', 'Unexpected activation (remote, BMS, key switch, sensors)'),
    head('safety_h_general_hazards', 'General Site Hazards'),
    tick('safety_s2_q10', 'Uneven surfaces / pits / edges'),
    tick('safety_s2_q11', 'Poor lighting or ventilation'),
    tick('safety_s2_q12', 'Weather exposure'),
    tick('safety_s2_q13', 'Noise / communication difficulty'),

    head('safety_h_step3', 'Step 3 \u2013 Critical Controls', 'All controls MUST be in place BEFORE work commences.'),
    head('safety_h_exclusion', 'Exclusion Zone'),
    std('safety_s3_q1', 'Turntable fully barricaded (cones, bollards, barriers, tape)', null, true),
    std('safety_s3_q2', 'Clear signage: DO NOT ENTER \u2014 MAINTENANCE IN PROGRESS', null, true),
    std('safety_s3_q3', 'No pedestrian or vehicle access possible', null, true),
    std('safety_s3_q4', 'Access points monitored or physically blocked',
      'RULE: If you cannot physically prevent access, do not proceed.', true),
    head('safety_h_traffic', 'Traffic Management (if applicable)'),
    std('safety_s3_q5', 'Vehicle movements stopped or controlled', null, true, true),
    std('safety_s3_q6', 'Spotter used where required', null, true, true),
    std('safety_s3_q7', 'Reversing vehicles excluded from area', null, true, true),
    std('safety_s3_q8', 'Forklifts / plant isolated or redirected', null, true, true),

    head('safety_h_step4', 'Step 4 \u2013 Isolation & Verification', 'RULE: Isolation must be proven, not assumed.'),
    tick('safety_s4_q1', 'Turntable power isolated', false),
    tick('safety_s4_q2', 'Lock-out / tag-out applied', false),
    tick('safety_s4_q3', 'Isolation tested and verified (try-start or meter)', false),
    tick('safety_s4_q4', 'All control interfaces disabled (keypads, remotes, BMS, interlocks)', false),

    head('safety_h_step5', 'Step 5 \u2013 Personal Safety Check'),
    tick('safety_s5_q1', 'Required PPE worn', false),
    tick('safety_s5_q2', 'Tools and equipment in safe condition', false),
    tick('safety_s5_q3', 'Safe access and egress available', false),
    tick('safety_s5_q4', 'Emergency stop / escape route identified', false),

    head('safety_h_step6', 'Step 6 \u2013 Final Decision'),
    yesNo('safety_s6_q1', 'I am satisfied the work can be done safely'),
    yesNo('safety_s6_q2', 'I will STOP work immediately if conditions change and re-do the Take 5'),

    head('safety_h_step7', 'Step 7 \u2013 Sign-Off', 'Sign and date after completing all steps.'),
    signOff('safety_s7_q1'),
  ];

  return { id: SAFETY_SECTION_ID, title: 'Safety', questions };
}
