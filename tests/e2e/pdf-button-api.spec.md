# PDF button click handler regression

## Scenario: Generate and download PDF calls the PDF API
1. Complete all mandatory Review Centre items.
2. Open Review & PDF.
3. Click Generate and download PDF.
4. Confirm the browser console logs Generate PDF clicked, Validation passed and Calling PDF API.
5. Confirm Chrome Network shows POST /api/pdf.
6. Confirm the response content type is application/pdf and the browser downloads the PDF.

## Scenario: validation failure is visible
1. Leave a mandatory Review Centre item incomplete.
2. Click Generate and download PDF.
3. Confirm the button click logs Generate PDF clicked.
4. Confirm the page displays PDF blocked by: followed by the exact failing validation title.
5. Confirm the button is not disabled silently.
