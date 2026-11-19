// Hand-build instructions for the "Family health sync" Shortcut, for when the signed file
// (public/apps/family-health-sync.shortcut here; source built by scripts/shortcut/build-shortcut.mjs) won't import.
// Same actions, in the same order, as the generated file. Action names are as they appear in the
// Shortcuts action search on iOS 17 and 18.

import { FAMILY_API } from "@/common/api/config";

type ShortcutStep = { action: string; settings: string };

const EMPTY_SAFE =
  "Do it as a block so a missing value can't stop the shortcut: Text (leave empty), Set Variable to that Text; " +
  "If Health Samples has any value: Calculate Statistics, Set Variable; End If.";

const metric = (type: string, when: string, extra: string, statistic: string, variable: string): ShortcutStep => ({
  action: "Find Health Samples",
  settings:
    `Type is ${type}; Start Date is between ${when}; ${extra}. ` +
    `Then the empty-safe block: Text (empty), Set Variable "${variable}" to Text; If Health Samples has any value, ` +
    `Calculate Statistics ${statistic} of Health Samples, Set Variable "${variable}" to Statistics; End If.`,
});

const sleepStage = (stage: string): ShortcutStep => ({
  action: "Find Health Samples",
  settings:
    `Type is Sleep (Sleep Analysis); Start Date is between SleepFrom and SleepTo; add a filter Value is ${stage}. ` +
    `Then If Health Samples has any value: Get Details of Health Sample, Duration, of Health Samples; ` +
    `Add to Variable "SleepSeconds"; End If.`,
});

const shortcutSteps: { title: string; steps: ShortcutStep[] } = {
  title: "Family health sync",
  steps: [
    { action: "New shortcut", settings: 'In Shortcuts tap +, name it "Family health sync". Add each action below in order (search by name).' },
    { action: "Text", settings: "Paste your Family health key (starts with fhk_). Nothing else in the box." },
    { action: "Set Variable", settings: 'Name "Key", input Text.' },
    { action: "Date", settings: "Current Date." },
    { action: "Adjust Date", settings: 'Get Start of Day of Date. Then Set Variable "Today" to Adjusted Date.' },
    { action: "Adjust Date", settings: 'Subtract 1 days from Today. Then Set Variable "Yesterday" to Adjusted Date.' },
    { action: "Format Date", settings: 'Yesterday, Date Format Custom, format string yyyy-MM-dd. Then Set Variable "Day" to Formatted Date.' },
    { action: "Adjust Date", settings: 'Subtract 7 days from Today, Set Variable "Week". Again: Subtract 30 days from Today, Set Variable "Month".' },
    {
      action: "Adjust Date",
      settings: 'Subtract 6 hours from Yesterday, Set Variable "SleepFrom". Again: Add 12 hours to Yesterday, Set Variable "SleepTo".',
    },
    { action: "How each health value is read", settings: EMPTY_SAFE },
    metric("Steps", "Yesterday and Today", "Group By Day", "Sum", "Steps"),
    metric("Active Energy (listed as Active Calories on some phones)", "Yesterday and Today", "Group By Day", "Sum", "ActiveKcal"),
    metric("Resting Heart Rate", "Yesterday and Today", "Group By Day", "Average", "RestingHR"),
    metric("Heart Rate Variability", "Yesterday and Today", "Group By Day", "Average", "HRV"),
    metric("Systolic Blood Pressure", "Yesterday and Today", "Sort by Start Date, Latest First, Limit 1", "Average", "BPSys"),
    metric("Diastolic Blood Pressure", "Yesterday and Today", "Sort by Start Date, Latest First, Limit 1", "Average", "BPDia"),
    metric("Weight", "Week and Today", "Sort by Start Date, Latest First, Limit 1", "Average", "Weight"),
    metric("Body Fat Percentage", "Week and Today", "Sort by Start Date, Latest First, Limit 1", "Average", "BodyFat"),
    metric("Lean Body Mass", "Week and Today", "Sort by Start Date, Latest First, Limit 1", "Average", "LeanMass"),
    metric("VO2 Max (Cardio Fitness)", "Month and Today", "Sort by Start Date, Latest First, Limit 1", "Average", "VO2Max"),
    sleepStage("Core"),
    sleepStage("Deep"),
    sleepStage("REM"),
    sleepStage("Asleep"),
    {
      action: "Text",
      settings:
        'Leave empty, then Set Variable "SleepHours" to Text. Then If SleepSeconds has any value: Calculate Statistics Sum of SleepSeconds; ' +
        'Calculate (the math action): Statistics ÷ 3600; Set Variable "SleepHours" to Calculation Result; End If.',
    },
    {
      action: "Get Contents of URL",
      settings:
        `URL ${FAMILY_API}/fitness/ingest. Tap Show More: Method POST; Headers: add Authorization with value ` +
        '"Bearer " then the Key variable (one space after Bearer); Request Body JSON, add these Text fields: date = Day, ' +
        "steps = Steps, active_kcal = ActiveKcal, resting_hr = RestingHR, hrv_ms = HRV, vo2max = VO2Max, weight_kg = Weight, " +
        "body_fat_pct = BodyFat, lean_mass_kg = LeanMass, bp_sys = BPSys, bp_dia = BPDia, sleep_h = SleepHours.",
    },
    { action: "Get Text from Input", settings: "Input: Contents of URL." },
    { action: "If", settings: 'Text does not contain "ok" (type the quote marks too).' },
    { action: "Show Notification", settings: 'Inside the If: "Family health sync failed". Then End If.' },
    {
      action: "Test it",
      settings:
        "Run the shortcut once by hand and allow Health access for every type it asks about. No notification means the Mac took it; " +
        "Fitness in the app shows yesterday's numbers.",
    },
    {
      action: "Automation",
      settings:
        "Shortcuts, Automation, +, Time of Day 08:00, Daily, Run Immediately, choose Family health sync. Health can't be read " +
        "while the phone is locked, so pick a time you're usually using your phone.",
    },
  ],
};

export { shortcutSteps };
export default shortcutSteps;
