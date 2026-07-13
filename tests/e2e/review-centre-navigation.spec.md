# Review Centre navigation e2e scenarios

## Scenario: mandatory issue navigates to the exact field
1. Start with a draft that is otherwise complete but has an empty emergency phone number.
2. Open Final review.
3. Confirm Review Centre shows one mandatory Emergency issue and PDF generation is disabled.
4. Select the issue action.
5. Confirm the wizard moves to Emergency, the emergency phone field scrolls into view, focus lands inside it, and Return to Review is visible.
6. Enter a phone number and select Return to Review.
7. Confirm the issue disappears and PDF generation becomes available when no blocking issues remain.

## Scenario: unreviewed AI suggestions block the AI declaration
1. Add an AI hazard suggestion with status pending.
2. Open Final review.
3. Confirm Review Centre lists the pending AI suggestion as mandatory.
4. Confirm the AI reviewed declaration is disabled while the suggestion is pending.
5. Select the issue action, accept or reject the AI suggestion, then return to Review.
6. Confirm the AI issue disappears and the AI reviewed declaration can only be checked after all AI suggestions are reviewed.
