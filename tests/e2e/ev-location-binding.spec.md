# EV location field binding regression

## Scenario: typing EV charger location does not affect battery location
1. Open the RAMS wizard and go to System.
2. Ensure both Proposed battery location and Proposed EV charger location are visible.
3. Focus Proposed EV charger location.
4. Type external wall.
5. Confirm focus remains on Proposed EV charger location.
6. Confirm proposedEvLocation contains external wall.
7. Confirm proposedBatteryLocation is unchanged.
8. Trigger Review Centre navigation for the EV location issue and confirm focus lands on proposed-ev-location, not proposed-battery-location.
