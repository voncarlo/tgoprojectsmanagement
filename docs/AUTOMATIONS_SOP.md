# Automations SOP

## Purpose
This document explains how the **Automations** area of the TGO Projects Portal works today, including:

- who can access it
- where to find it
- what every visible button and control does
- what data is shown on the page
- what is currently functional vs not yet fully implemented

This SOP reflects the current app behavior in code as of this version of the project.

## Access And Permissions

### Who can open Automations
Only these roles can access the **Automations** module:

- `Super Admin`
- `Admin`

### Who cannot open Automations
These roles do **not** have access:

- `Manager`
- `Staff`

### Why
The module is treated as an **admin-only module** in the permission system. Even if a lower role somehow had old saved module data, the app still treats `automations` as admin-only.

### Related permission notes
- `Super Admin` and `Admin` both have the `automations.manage` capability in the permission matrix.
- The current Automations page is effectively protected by module access, not by a separate button-level permission check.

## Where To Find It

### Sidebar
Location:
- `System` section
- `Automations`

### Route
URL path:
- `/automations`

## Page Overview
The Automations page is a **single-page overview**. It currently has:

- no internal tabs
- a page header
- four summary stat cards
- a list of existing automation rules
- a `New automation` dialog

## Page Header

### Title
`Automations`

### Description
`Trigger-based workflows, scheduled rules, and run logs.`

### Header Button
`New automation`

What it does:
- opens the automation creation dialog

What it does not do yet:
- it does not create a persisted automation rule in app state or database

## Summary Stat Tiles
At the top of the page there are 4 stat tiles.

### 1. Active rules
Shows:
- total number of automation rules with `enabled: true`

### 2. Total runs
Shows:
- sum of all `runs` across all automation rules

### 3. Errors (7d)
Shows:
- sum of all `errors` across all automation rules

Important note:
- the label says `7d`, but the app is currently using the stored `errors` value directly
- there is no separate rolling 7-day calculation logic implemented

### 4. Healthy rules
Shows:
- `rules.length - errors`

Important note:
- this is a simple display formula
- it does not mean “rules with zero errors” in a strict technical sense
- it subtracts total error count from total rule count

## Automation Rule Cards
Each automation appears as one card in the main list.

### What each card shows

#### Automation icon block
Shows:
- workflow icon

Visual behavior:
- highlighted when enabled
- muted when disabled

#### Rule name
Example:
- `Notify manager on overdue task`

#### Error badge
Only appears when:
- `rule.errors > 0`

Badge text example:
- `1 error`

#### When line
Format:
- `When: [trigger]`

Example:
- `When: Task overdue > 24h`

#### Then line
Format:
- `Then: [action]`

Example:
- `Then: Send notification to team manager`

#### Footer meta
Shows:
- last run time
- total run count

Example:
- `Last run 12m ago`
- `142 total runs`

#### Enable/disable switch
This is the main live control on each rule card.

What it does:
- toggles the rule’s `enabled` state in app state
- shows toast feedback
- writes an audit log entry

Toast behavior:
- if the rule was enabled and is switched off: `Automation paused`
- if the rule was disabled and is switched on: `Automation enabled`

Audit log behavior:
- when turned on: `Enabled automation`
- when turned off: `Paused automation`

Important note:
- this toggle is persisted in app state storage
- it changes the rule status, but it does not execute the automation immediately

## New Automation Dialog
Clicking `New automation` opens a modal dialog.

### Dialog title
`New automation`

### Dialog description
`Draft a workflow rule for the portal.`

### Fields

#### Name
Purpose:
- label for the automation rule

Placeholder:
- `Notify finance on overdue invoice`

#### Trigger
Purpose:
- describes the event or condition that should start the automation

Placeholder:
- `Invoice overdue > 24h`

#### Action
Purpose:
- describes what should happen when the trigger condition is met

Placeholder:
- `Send alert to bookkeeping lead`

### Buttons

#### Cancel
What it does:
- closes the dialog
- does not save anything

#### Save draft
What it does today:
- validates that `Name`, `Trigger`, and `Action` are filled in
- if any are blank, shows an error toast:
  - `Name, trigger, and action are required.`
- if all are filled, shows an informational toast:
  - `Automation creation UI is ready; persistence for custom rules is next.`
- then clears the form and closes the dialog

What it does not do yet:
- it does **not** add a new automation to the rules list
- it does **not** persist the new automation in state
- it does **not** save to local storage or server

## Current Seeded Automation Rules
The app currently starts with these automation rules:

1. `Notify manager on overdue task`
Trigger:
`Task overdue > 24h`
Action:
`Send notification to team manager`

2. `Auto-move completed → Waiting Review`
Trigger:
`Task marked Completed`
Action:
`Move to Waiting Review if approval required`

3. `Weekly recurring: Driver check-in`
Trigger:
`Every Monday 8:00 AM`
Action:
`Create task for each driver`

4. `Remind inactive assignees`
Trigger:
`No update > 5 days`
Action:
`Send reminder + escalate`

5. `Auto-archive cancelled tasks`
Trigger:
`Status changed to Cancelled`
Action:
`Archive after 7 days`

## What Is Actually Functional Today

### Working now
- viewing the Automations page
- seeing automation stats
- viewing all seeded rule cards
- toggling rules on and off
- persisting enable/disable state through app state storage
- writing audit entries when a rule is toggled
- opening the `New automation` dialog
- validating required dialog fields

### Not fully implemented yet
- creating brand-new automation rules from the dialog
- editing automation name/trigger/action after creation
- deleting automation rules
- filtering/searching automations
- viewing per-rule execution logs
- real scheduling engine
- real trigger execution backend
- real error-history drilldown

## Data Source And Persistence

### Source of default rules
Seeded in:
- `src/data/mock.ts`

### State management
Managed in:
- `src/store/DataContext.tsx`

### Toggle logic
Function:
- `toggleAutomation(id)`

What it changes:
- flips `enabled` between `true` and `false`

What else it does:
- appends audit activity for enable/pause actions

## Audit Trail Behavior
When an admin toggles an automation, the app adds an audit log entry.

Examples:
- `Enabled automation`
- `Paused automation`

Category:
- `System`

User:
- current logged-in user

Target:
- automation rule name

## SOP For Admin Use

### To review automation health
1. Open `System > Automations`.
2. Review the four summary stat tiles.
3. Scan the rule cards for any error badges.
4. Check each rule’s `Last run` and `total runs` metadata.

### To pause an automation
1. Find the automation card.
2. Click the switch on the right side of the card.
3. Confirm the toast says `Automation paused`.
4. If needed, review the Activity Logs or Admin audit areas for the system event.

### To re-enable an automation
1. Find the disabled automation card.
2. Click the switch again.
3. Confirm the toast says `Automation enabled`.

### To draft a new automation idea
1. Click `New automation`.
2. Fill in `Name`.
3. Fill in `Trigger`.
4. Fill in `Action`.
5. Click `Save draft`.
6. Note that the app currently treats this as a UI-only draft flow and does not save a real rule yet.

## Important Limitations To Remember
- There are currently **no tabs** inside the Automations page.
- The only live rule-management action is the **enable/disable switch**.
- `Save draft` is currently a placeholder flow, not a real save.
- Stats are based on stored values in the seeded/persisted rule objects.
- The automation engine shown here is a management UI, not a full backend workflow engine yet.

## File References
Main files involved:

- `src/pages/Automations.tsx`
- `src/store/DataContext.tsx`
- `src/data/mock.ts`
- `src/auth/permissions.ts`

## Recommended Future Improvements
If you want this area to behave more like a full production automation center, the next best upgrades would be:

1. Persist new rules from the dialog into state and storage.
2. Add edit and delete actions per rule.
3. Add run-history details per automation.
4. Add filtering by enabled, disabled, healthy, and error state.
5. Add role/capability checks directly on the page controls.
6. Add backend execution logic for real trigger processing.
