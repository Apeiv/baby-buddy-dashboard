# Changelog

## 1.4.0

- Replaced the two separate header icons (manual refresh, error log)
  with a single Settings panel: a connection-status row ("Connected"
  in green with last sync time, or the error in red) followed by the
  error log/export/clear section that used to be its own popup.
- Temperature entries can now be edited and deleted, like every other
  metric - previously there was no edit mode at all. Added a
  Temperature card (Notes & Meds tab, next to Medications) with a
  48h/72h/96h trend chart, since a short high-resolution window
  matters more than a 30-day trend when tracking a fever.
- Added a small pulsing red dot on the "Notes & Meds" tab button
  whenever any medication is currently overdue, so it's visible
  without opening the tab.
- Added an opt-in "Medication Alerts" option that exposes a single
  `binary_sensor.baby_buddy_medication_overdue` entity in Home
  Assistant (via the Supervisor's Core API, no MQTT broker needed),
  reflecting whether any medication is currently overdue across all
  children. Off by default; build your own automation/notification
  on top of it once enabled.
- Added an automated test suite: Vitest for the frontend, pytest for
  the backend, both fully mocked with zero live calls to a real Baby
  Buddy or Home Assistant instance.

## 1.3.4

- Added the ability to delete an entry when editing it - every "Edit"
  form (Feeding, Sleep, Diaper, Tummy Time, Weight, Height, Head
  Circumference, BMI, Medication, Note) now has a "Delete" link above
  the update button, with an inline "Delete this entry? / Cancel"
  confirmation step before anything is actually removed. Previously
  there was no way to undo a mis-logged entry short of editing it
  into something else.

## 1.3.3

- Added a "Mark as taken" quick-log button to each medication's status
  badge (Notes & Meds tab) - one tap logs a new dose reusing the same
  name/dosage/unit/interval as the last one, timestamped now, instead
  of opening the full form.
- The "next dose due" badge now shows how late a dose is ("Overdue by
  3h 20m") and which day the next one is due ("Next: Tomorrow at
  19:00") instead of just a bare time with no date context.
- Added a way to manually set the next dose time (clock icon next to
  the badge) - pick a date/time and it recalculates the underlying
  interval on the last logged dose accordingly.
- Added a 30-day Medication Log (date-range selectable, CSV export)
  under the Medications card, so you can review or export what was
  actually given over time.

## 1.3.2

- Fixed the Feedings card on Overview showing the count twice (big
  number "9" plus a redundant "9 today" line below it). Now shows
  "9 Today" as the headline value and "Last: 1h 59m ago" underneath.

## 1.3.1

- Split the single "Daily Report" into two focused reports: "Daily
  Report — Growth" (feeding, diaper, sleep, tummy time) and "Daily
  Report — Measure" (weight, height, head circumference, BMI).
  Weight/Height/Head Circ./BMI stat cards now open the Measure
  report instead of a report that never included their own data.
- Added an "Avg Diapers" stat card to the Growth tab, matching the
  existing Avg Feeding/Avg Sleep cards.
- Fixed a mobile layout bug where the quick-stat grid rendered 1 or 2
  columns inconsistently depending on the exact phone width (e.g.
  iPhone 12 vs iPhone 16, both ~390px, would render differently).
  It's now a fixed 2-column layout on mobile regardless of device.
- Added BMI, head circumference, and medication tracking, backed by
  Baby Buddy's existing `/api/bmi/`, `/api/head-circumference/`, and
  `/api/medication/` endpoints. New FAB actions, Growth tab trend
  charts, and a combined "Notes & Meds" tab with a Medications card
  showing recent doses and a "next dose due" / "overdue" indicator.
- Feeding charts (Overview weekly, Growth 30-day) now show feeding
  count alongside amount, with a settings toggle to pick which
  metric(s) to display.
- Fixed forms failing silently on a network error - a failed save
  now shows an inline error banner and logs to a small, exportable
  error log (new header button with an unread-count badge).
- Fixed `timeAgo()` truncating to whole hours/days (e.g. "1h ago" for
  anything between 60-119 minutes); now shows "1h 32m ago".
- Fixed the Report view failing when Demo Mode is enabled - it now
  builds report rows from the bundled demo data instead of calling
  the (nonexistent, in demo mode) live API.
- Accessibility: added `aria-label`s to icon-only buttons and
  keyboard support (Enter/Space) to click-to-edit rows and cards.
- Hardened the backend's static file path check against path
  traversal.

## 1.2.9

- Fixed the quick-stat and section-card grids collapsing to a single
  column on phone-width screens instead of keeping a readable
  multi-column layout.
