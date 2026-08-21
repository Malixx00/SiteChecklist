// Built-in default survey ("Turntable Service Checklist").
// Port of com.sitereporter.domain.SurveySeeder.
//
// Generated from Turntable_Service_Checklist.xlsx. The mandatory safety section
// is NOT here - safety.js is prepended to every survey by state.js.

import { question } from './logic.js';

export const DEFAULT_SURVEY_ID = 'service_survey';
export const DEFAULT_SURVEY_NAME = 'Turntable Service Checklist';
export const DEFAULT_SURVEY_DESCRIPTION = 'Turntable service and inspection checklist';

/** Bump whenever buildDefaultQuestions() changes so existing installs re-seed. */
export const SEED_VERSION = 4;

export function buildDefaultQuestions() {
  const sid = DEFAULT_SURVEY_ID;
  let so = 0;

  const head = (id, section, title, description = null) =>
    question({ id, surveyId: sid, sortOrder: so++, section, isHeading: true, title, description,
      yesButton: false, noButton: false, commentsShown: false });

  // Service-survey defaults differ from the safety section: Pass / Issue.
  const q = (id, section, title, description = null, o = {}) =>
    question({
      id, surveyId: sid, sortOrder: so++, section, title, description,
      yesButton: o.yBtn ?? true, yesText: o.yTxt ?? 'Pass',
      noButton: o.nBtn ?? true, noText: o.nTxt ?? 'Issue',
      checkboxes: (o.opts ?? []).length > 0, checkboxOptions: o.opts ?? [],
      photoRequired: o.photo ?? false, videoRequired: o.video ?? false,
      commentsShown: o.comments ?? true, commentsLabel: o.label ?? 'Add Note',
      isOptional: o.optional ?? false,
    });

  return [
    // -- Controls ----------------------------------------------------------
    head('svc_h02_controls', 'controls', 'CONTROLS',
      'Inspect the control enclosure, electrical installation, VSD settings and operator controls.'),
    q('svc_q003', 'controls', 'Control enclosure condition acceptable?',
      'Inspect the enclosure exterior and interior. Tick any issues found. Photograph any defect.',
      { opts: ['Enclosure', 'Hinges', 'Locks', 'Moisture ingress', 'Corrosion', 'Switches & Lights', 'Internal Electronics'], photo: true }),
    q('svc_q004', 'controls', 'VSD fault status checked?',
      'Review active faults and available fault history. Record all fault codes and any corrective action.'),
    q('svc_q005', 'controls', 'Operator controls and indicators acceptable?',
      'Inspect and function-test all fitted operator devices. Tick any issues found.',
      { opts: ['Switches', 'Pushbuttons', 'Indicators'] }),
    q('svc_q006', 'controls', 'Required labels and signage present and legible?',
      'Confirm all safety, operating and identification labels required by the drawing or label schedule are installed, correct and readable.',
      { photo: true }),

    // -- Remote Controls ---------------------------------------------------
    head('svc_h03_remote_controls', 'remote_controls', 'REMOTE CONTROLS',
      'Complete where the turntable is fitted with handheld or wireless remote controls.'),
    q('svc_q008', 'remote_controls', 'Remote controls function correctly?',
      'Test remotes and the receiver. Confirm clockwise, anticlockwise, all buttons and dead-man operation where applicable. Tick any issues found.',
      { opts: ['Clockwise', 'Anticlockwise', 'All buttons', 'Dead-man operation', 'Housing', 'Battery replaced'], optional: true }),

    // -- Platform And Deck -------------------------------------------------
    head('svc_h04_platform_and_deck', 'platform_and_deck', 'PLATFORM AND DECK',
      'Inspect the visible deck structure, surface fixings and access hatches before dynamic testing.'),
    q('svc_q010', 'platform_and_deck', 'Deck and accessible platform surfaces cleaned?',
      'Remove loose debris and contamination that could conceal damage, create a hazard or interfere with operation.',
      { yTxt: 'Done', nTxt: 'Unable' }),
    q('svc_q011', 'platform_and_deck', 'Deck, panels and fixings acceptable?',
      'Inspect for deformation, corrosion, loose or missing rivets and fixings, damaged panels, sharp edges and trip hazards. \nEach fitted hatch is undamaged, sits correctly, is securely retained and can be removed using the intended tools.\nTick any issues found. Photograph the overall deck and any defect.',
      { opts: ['Deck surface', 'Panels', 'Rivets', 'Fixings', 'Trip hazards', 'Inspection'], photo: true }),

    // -- Centre Bearing ----------------------------------------------------
    head('svc_h05_centre_bearing', 'centre_bearing', 'CENTRE BEARING',
      'Inspect the bearing support, mounting condition, corrosion protection, lubrication and cleanliness.'),
    q('svc_q013', 'centre_bearing', 'Centre-bearing area cleaned?',
      'Remove debris, water and contamination that could obstruct inspection, retain moisture or interfere with the bearing assembly.',
      { yTxt: 'Done', nTxt: 'N/A' }),
    q('svc_q014', 'centre_bearing', 'Centre-bearing support condition acceptable?',
      'Inspect packing, grout, mounting and the surrounding structure for cracking, movement, deterioration or impact damage.\nTick any issues found.',
      { opts: ['Packing & Grout', 'Mounting', 'Surrounding structure'], photo: true }),
    q('svc_q015', 'centre_bearing', 'Centre-bearing fasteners secure?',
      'Check all accessible mounting fasteners for looseness, damage, elongated holes or evidence of movement. Record torque only where a specified value is available. '),
    q('svc_q016', 'centre_bearing', 'Centre-bearing corrosion acceptable?',
      'Assess corrosion against company criteria. Treat minor surface corrosion only. Escalate section loss, failed coatings or structural corrosion for engineering review.'),
    q('svc_q017', 'centre_bearing', 'Centre bearing lubricated?',
      'Lubricate using the specified product, lubrication points and method. Record lubricant type and quantity or number of grease strokes where practicable.',
      { yTxt: 'Done', nTxt: 'N/A', optional: true }),

    // -- Running Track -----------------------------------------------------
    head('svc_h06_running_track', 'running_track', 'RUNNING TRACK',
      'Inspect the track support, level, joins, corrosion and cleanliness around the full accessible circumference.'),
    q('svc_q019', 'running_track', 'Running track and surrounding area cleaned?',
      'Remove debris and contamination from the running surface, joins and adjacent wheel path.',
      { yTxt: 'Done', nTxt: 'Unable' }),
    q('svc_q020', 'running_track', 'Running-track support condition acceptable?',
      'Inspect packing, grout, supports and mounting fasteners for cracking, movement, looseness, distortion or deterioration.\nTick any issues found.',
      { opts: ['Packing & Grout', 'Running Tracks', 'Fasteners'], photo: true }),
    q('svc_q021', 'running_track', 'Track joins acceptable?',
      'Inspect every accessible join for step, gap, misalignment, impact marks and abnormal wear. Tick any issues found.',
      { opts: ['Step', 'Gap', 'Alignment', 'Impact marks', 'Wear'], photo: true }),
    q('svc_q022', 'running_track', 'Running-track corrosion acceptable?',
      'Assess corrosion against company criteria. Treat minor surface corrosion only and photograph any corrosion requiring repair or engineering review.'),

    // -- Support Wheels ----------------------------------------------------
    head('svc_h07_support_wheels', 'support_wheels', 'SUPPORT WHEELS',
      'Inspect wheel material, bearings, shafts, free rotation, tracking and operating noise.'),
    q('svc_q024', 'support_wheels', 'Wheel surfaces acceptable?',
      'Inspect each accessible wheel for flat spots, cracking, delamination, uneven wear and loss of profile. Tick every issue found.',
      { opts: ['Flat spots', 'Cracking', 'Delamination', 'Uneven wear', 'Profile loss'], photo: true }),
    q('svc_q025', 'support_wheels', 'Wheel bearings and shafts acceptable?',
      'Check for excessive play, seizure, roughness, shaft damage and corrosion. Diagnose the cause before recommending replacement.  Confirm wheels rotate freely.\nTick every issue found.',
      { opts: ['Excessive play', 'Seizure', 'Roughness', 'Shaft damage', 'Corrosion'] }),

    // -- Drain And Pit -----------------------------------------------------
    head('svc_h08_drain_and_pit', 'drain_and_pit', 'DRAIN AND PIT',
      'Confirm the pit drainage path is functional and remove accumulated debris and standing water where practicable.'),
    q('svc_q027', 'drain_and_pit', 'Drain clear and flowing correctly?',
      'Inspect the drain and verify that water can flow away. Record blockages, damaged drainage components or evidence of recurring water ingress.',
      { photo: true, optional: true }),
    q('svc_q028', 'drain_and_pit', 'Pit cleaned?',
      'Remove accessible debris, sludge and standing water. Record any material that could not be removed or any access limitation.',
      { yTxt: 'Done', nTxt: 'Unable', photo: true }),

    // -- Gear Rack And Pinion ----------------------------------------------
    head('svc_h09_gear_rack_and_pinion', 'gear_rack_and_pinion', 'GEAR RACK AND PINION (IF APPLICABLE)',
      'Inspect rack condition and confirm correct pinion engagement through the operating rotation.'),
    q('svc_q030', 'gear_rack_and_pinion', 'Gear rack cleaned?',
      'Remove debris and contamination from the rack tooth profile and joins. Do not remove required lubricant or apply an unapproved lubricant.',
      { yTxt: 'Done', nTxt: 'Unable' }),
    q('svc_q031', 'gear_rack_and_pinion', 'Gear rack condition and alignment acceptable?',
      'Inspect rack teeth, joins, alignment, excessive backlash and abnormal wear. Record the location of damaged teeth, poor joins or excessive movement.\nTick every issue found.',
      { opts: ['Teeth', 'Joins', 'Alignment', 'Excessive Backlash', 'Wear'], photo: true }),
    q('svc_q032', 'gear_rack_and_pinion', 'Pinion mesh correct through full rotation?',
      'Observe pinion engagement through a complete rotation. Confirm consistent tooth contact without binding, excessive backlash, climbing or loss of engagement.',
      { video: true }),

    // -- Gear Motor / Drive Assembly ---------------------------------------
    head('svc_h10_gear_motor_drive_assembly', 'gear_motor_drive_assembly', 'GEAR MOTOR / DRIVE ASSEMBLY',
      'Inspect the drive mounting, mechanical condition, electrical connections, identification and cleanliness.'),
    q('svc_q034', 'gear_motor_drive_assembly', 'Drive assembly and surrounding area cleaned?',
      'Remove debris and contamination without directing water or cleaning products into the motor, gearbox, bearings, glands or electrical connections.',
      { yTxt: 'Done', nTxt: 'Unable' }),
    q('svc_q035', 'gear_motor_drive_assembly', 'Drive assembly mounting acceptable?',
      'Inspect motor and gearbox for cracking, looseness, movement, damage or deterioration.\nTick every issue found.',
      { opts: ['Motor', 'Gearbox', 'Exposed Cables', 'Exposed Glands', 'Oil leakage', 'Corrosion'], photo: true }),
    q('svc_q036', 'gear_motor_drive_assembly', 'Gearbox oil level and condition checked?',
      'Complete only where the gearbox model provides an oil-level or oil-condition check. Record leakage, oil condition and any oil added or replaced.',
      { yTxt: 'Recorded', nTxt: 'N/A', optional: true }),
    q('svc_q037', 'gear_motor_drive_assembly', 'Drive wheel acceptable?',
      'Inspect for wear, cracks, tooth or surface damage and correct engagement. Record measurements where a wear limit or project tolerance is available.',
      { photo: true }),
    q('svc_q038', 'gear_motor_drive_assembly', 'Drive electrical connections acceptable?',
      'Inspect terminations, earthing, cable protection and glands for security, damage, corrosion and compliance with the electrical drawings.\nTick every issue found.',
      { opts: ['Terminations', 'Earthing', 'Cable protection', 'Glands'] }),
    q('svc_q039', 'gear_motor_drive_assembly', 'Motor and gearbox identification recorded?',
      'Record manufacturer, model and serial number for the motor and gearbox. Attach a clear overall photo and readable nameplate photo.',
      { yTxt: 'Recorded', nTxt: 'Unable', photo: true }),

    // -- Sensors And Home Position -----------------------------------------
    head('svc_h11_sensors_and_home_position', 'sensors_and_home_position', 'SENSORS AND HOME POSITION',
      'Complete for systems fitted with position, limit, collision or home-position sensors.'),
    q('svc_q041', 'sensors_and_home_position', 'Sensor physical condition acceptable?',
      'Inspect each applicable sensor for damage, secure mounting, correct alignment, sound wiring and expected status indication.\nTick every issue found.',
      { opts: ['Damage', 'Mounting', 'Alignment', 'Wiring', 'Indication'], optional: true }),
    q('svc_q042', 'sensors_and_home_position', 'Sensors function and switch repeatably?',
      'Function-test each applicable sensor through the operating sequence. Confirm reliable detection and repeatable switching at the intended position.',
      { nTxt: 'N/A', optional: true }),
    q('svc_q043', 'sensors_and_home_position', 'Home-position operation acceptable?',
      'Verify home search, stopping position and repeatability. Record the final stopping error or variation against the project tolerance.',
      { nTxt: 'N/A', video: true, optional: true }),

    // -- No-Load Function Test ---------------------------------------------
    head('svc_h12_no_load_function_test', 'no_load_function_test', 'NO-LOAD FUNCTION TEST',
      'Operate the turntable without a vehicle and record dynamic performance in both directions.'),
    q('svc_q045', 'no_load_function_test', 'No-load operation completed in both directions?',
      'Operate clockwise and anticlockwise from the local controls through a representative cycle. Stop immediately if unsafe movement or a significant fault occurs.\nTick every issue found.',
      { opts: ['Clockwise', 'Anticlockwise'], video: true }),
    q('svc_q046', 'no_load_function_test', 'Rotation operating noise acceptable?',
      'Listen for grinding, knocking, squealing or bearing noise. Record the approximate location (fixed loaction or rotating with turntable) and attach video where abnormal noise is present.',
      { opts: ['Noise', 'Vibration', 'Wheel behaviour', 'Drivetrain movement'] }),
    q('svc_q047', 'no_load_function_test', 'Acceleration and deceleration acceptable?',
      'Confirm smooth ramp-up and ramp-down in both directions, without excessive jerk, overshoot, overvoltage or overcurrent faults.\nTick every issue found.',
      { opts: ['CW acceleration', 'CW deceleration', 'CCW acceleration', 'CCW deceleration'] }),
    q('svc_q048', 'no_load_function_test', 'No-load VSD output current recorded?',
      'Record parameter D002 while operating at max. speed',
      { yTxt: 'Recorded', nTxt: 'Unable', photo: true }),

    // -- Load Function Test ------------------------------------------------
    head('svc_h13_load_test_using_vehicle', 'load_test_using_vehicle', 'LOAD FUNCTION TEST',
      'Complete only where a suitable vehicle, client authorisation and safe test conditions are available.'),
    q('svc_q050', 'load_test_using_vehicle', 'Load operation completed in both directions?',
      'Operate clockwise and anticlockwise from the local controls through a representative cycle. Stop immediately if unsafe movement or a significant fault occurs.\nTick every issue found.',
      { opts: ['Clockwise', 'Anticlockwise'], video: true, optional: true }),
    q('svc_q051', 'load_test_using_vehicle', 'Rotation operating noise acceptable?',
      'Listen for grinding, knocking, squealing or bearing noise. Record the approximate location (fixed loaction or rotating with turntable) and attach video where abnormal noise is present.',
      { opts: ['Noise', 'Vibration', 'Wheel behaviour', 'Drivetrain movement'], optional: true }),
    q('svc_q052', 'load_test_using_vehicle', 'Acceleration and deceleration acceptable?',
      'Confirm smooth ramp-up and ramp-down in both directions, without excessive jerk, overshoot, overvoltage or overcurrent faults.\nTick every issue found.',
      { opts: ['CW acceleration', 'CW deceleration', 'CCW acceleration', 'CCW deceleration'], optional: true }),
    q('svc_q053', 'load_test_using_vehicle', 'Load VSD output current recorded?',
      'Record parameter D002 while operating at max. speed',
      { yTxt: 'Recorded', nTxt: 'Unable', photo: true, optional: true }),

    // -- Final Cleaning And Handover ---------------------------------------
    head('svc_h14_final_cleaning_and_handover', 'final_cleaning_and_handover', 'FINAL CLEANING AND HANDOVER',
      'Restore the equipment and work area to a safe, clean and agreed operating condition.'),
    q('svc_q055', 'final_cleaning_and_handover', 'Pit and deck final cleaning completed?',
      'Wet/dry vacuum the pit and deck. Pressure wash only where drainage is adequate and electrical, sensor, bearing and lubrication points are protected.',
      { yTxt: 'Done', nTxt: 'Unable', photo: true }),
    q('svc_q056', 'final_cleaning_and_handover', 'Guards, hatches, covers and enclosure doors secure?',
      'Confirm every removed or opened protective item is refitted, correctly positioned and secured before returning the equipment to service.\nTick every issue found.',
      { opts: ['Guards', 'Hatches', 'Covers', 'Control enclosure doors'], photo: true }),
    q('svc_q057', 'final_cleaning_and_handover', 'Tools, waste and exclusion controls removed safely?',
      'Remove tools, loose parts and waste. Remove the exclusion zone only after the turntable and surrounding area are safe for normal access.',
      { yTxt: 'Done' }),
    q('svc_q058', 'final_cleaning_and_handover', 'Final functional check completed and operating state agreed?',
      'Complete a final functional check and leave the equipment in the operating state agreed with the client. Record restrictions, isolations or disabled functions.',
      { yTxt: 'Done', nTxt: 'Restricted' }),

    // -- Service Report Summary --------------------------------------------
    head('svc_h15_service_report_summary', 'service_report_summary', 'SERVICE REPORT SUMMARY',
      'Summarise defects, client requests, recommendations and evidence before sign-off.'),
    q('svc_q060', 'service_report_summary', 'Client requests recorded?',
      'Record all client requests, observations or requested changes, including items outside the completed service scope.',
      { yTxt: 'Recorded', nTxt: 'None' }),
    q('svc_q061', 'service_report_summary', 'Recommended parts and upgrades recorded?',
      'List recommended parts or upgrades with quantity, reason, priority and recommended replacement timeframe.',
      { yTxt: 'Recorded', nTxt: 'None' }),
  ];
}
