# Login and wizard header e2e scenarios

## Scenario: valid access code opens the app on the first submit
1. Open the SolarFX RAMS access screen.
2. Enter the valid four-digit team access code.
3. Submit the form with Enter or the Unlock RAMS Generator button.
4. Confirm the button immediately changes to Unlocking... and both the input and button are disabled.
5. Confirm the server returns success with a protected redirect target and a session cookie.
6. Confirm the app opens at the protected RAMS route without needing to submit the code again.

## Scenario: invalid access code keeps focus and explains the issue
1. Enter an incorrect four-digit access code.
2. Submit the form.
3. Confirm the page announces Incorrect access code.
4. Confirm the entered code remains visible and focus returns to the code field.
5. Confirm a second submit is not triggered while the first request is running.

## Scenario: wizard step navigation remains readable on small screens
1. Open the RAMS wizard at 1440, 1280, 1024, 768 and 390 pixel widths.
2. Confirm each step pill shows the step number, one status indicator and the short label only.
3. Confirm the active step has aria-current=step and scrolls into view.
4. Confirm completed steps show the tick indicator, warnings/errors show count badges, and OK text is not visible.
5. Confirm the page itself does not overflow horizontally; only the step strip scrolls.

## Scenario: return to review bar does not collide with navigation
1. Open Review Centre and select an issue action.
2. Confirm the wizard moves to the target step and the target field is highlighted.
3. Confirm a slim sticky bar appears below the wizard navigation with Fixing: [issue title].
4. Select Return to Review and confirm the Review Centre is visible again.
