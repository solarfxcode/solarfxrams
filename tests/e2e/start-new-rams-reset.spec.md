# Start new RAMS reset flow e2e scenarios

## Scenario: Start new RAMS requires confirmation
1. Open the RAMS app with an existing draft containing job details, system details, photos, AI suggestions and risk rows.
2. Select Start new RAMS from the app header.
3. Confirm the Start a new RAMS? modal opens.
4. Confirm Clear and start new RAMS is disabled until I understand the current draft will be deleted is checked.
5. Select Cancel and confirm all draft values remain unchanged and focus returns to the Start new RAMS button.

## Scenario: confirmed reset clears the current job only
1. Reopen the modal, tick the acknowledgement checkbox and select Clear and start new RAMS.
2. Confirm the wizard returns to Step 1 and the page scrolls to the top.
3. Confirm job details, system details, imported PDF metadata, photos, AI suggestions, risks, method edits, emergency details, declarations and approval details are empty/default.
4. Confirm the user remains logged in.
5. Refresh the page and confirm the old draft does not return.

## Scenario: PDF download warning and timestamp
1. Open Review & PDF before generating a PDF.
2. Open Start new RAMS and confirm the modal warns This RAMS has not been downloaded as a PDF.
3. Cancel, generate and download the PDF, and confirm Review displays the downloaded date/time and filename.
4. Open Start new RAMS again and confirm the not-downloaded warning is no longer shown for that draft.

## Scenario: autosave race does not restore old data
1. Edit a field that would normally trigger autosave.
2. Immediately open Start new RAMS and confirm the reset.
3. Wait longer than any autosave debounce period.
4. Refresh and confirm the old edited value is not restored.
