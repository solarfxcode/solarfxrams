# Login navigation stuck regression

## Scenario: successful login reaches dashboard UI
1. Open the SolarFX RAMS access screen.
2. Enter the valid four-digit access code and submit.
3. Confirm the login request succeeds and the UI logs login success.
4. Confirm the client sets authenticated state and calls router.replace('/dashboard') without router.refresh().
5. Confirm the dashboard route renders the RAMS dashboard skeleton immediately.
6. Confirm session and draft loading are logged in the background.
7. Confirm the RAMS wizard appears after draft hydration.
8. If dashboard navigation takes longer than five seconds, confirm the log names the waiting step and the hard-navigation fallback runs.
