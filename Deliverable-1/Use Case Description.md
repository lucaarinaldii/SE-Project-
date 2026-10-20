# Use Case Descriptions — Campus Makerspace Management System

## 1. Report

| | |
|---|---|
| **Use Case Name** | Report |
| **Actors** | User (primary)<br>Staff (secondary) |
| **Preconditions** | - User is authenticated in the system;<br>- User has an active or recently completed reservation for the equipment. |
| **Main Success Scenario** | User wants to report a problem with the equipment they used.<br>1. User opens their reservation and selects the equipment.<br>2. System checks that the user has a reservation for this equipment.<br>3. User chooses "Report".<br>4. User selects the issue type and enters a description.<br>5. System saves the report with status "Open".<br>6. System notifies the staff.<br>7. User receives a confirmation. |
| **Extensions (Alternate Flows)** | **No reservation found:**<br>1. Report is not allowed;<br>2. System shows an error to the user.<br><br>**Required fields are empty:**<br>1. System highlights the missing fields;<br>2. User completes them and resubmits.<br><br>**Machine is unsafe to use:**<br>1. Staff reviews the report;<br>2. Staff blocks the machine ("Block Machine" extends this use case). |
| **Postconditions** | Success: report is saved and staff is notified.<br>Exception: report is not created and the user is informed why. |

## 2. Block Machine

| | |
|---|---|
| **Use Case Name** | Block Machine |
| **Actors** | Staff (primary)<br>User (secondary) |
| **Preconditions** | - Staff is authenticated in the system;<br>- Staff has staff rights;<br>- The machine exists in the system. |
| **Main Success Scenario** | Staff wants to make a machine unavailable for maintenance or repair.<br>1. Staff selects the machine.<br>2. Staff chooses "Block machine".<br>3. Staff enters the reason and the block period.<br>4. System shows the reservations in this period.<br>5. Staff decides which reservations to cancel.<br>6. System cancels the selected reservations and notifies the affected users.<br>7. System sets the machine status to "Blocked".<br>8. Staff receives a confirmation. |
| **Extensions (Alternate Flows)** | **Machine is already blocked:**<br>1. System shows the current block details;<br>2. Staff can edit or extend the existing block.<br><br>**Machine is currently in use:**<br>1. System warns the staff about the active session;<br>2. Staff chooses to block immediately or after the session ends. |
| **Postconditions** | Success: machine is blocked for the given period and affected users are notified.<br>Exception: machine status is unchanged. |

## 3. Reserve Time Slot

| | |
|---|---|
| **Use Case Name** | Reserve time slot |
| **Actors** | User (primary) |
| **Preconditions** | - User is authenticated in the system. |
| **Main Success Scenario** | User wants to reserve a piece of equipment.<br>1. User selects the equipment.<br>2. System **includes** "Track Availability" and shows free time slots.<br>3. User selects a time slot.<br>4. System checks that the slot is still free.<br>5. Reservation is created.<br>6. User receives a confirmation.<br>7. User confirms the reservation 15 minutes before the start. |
| **Extensions (Alternate Flows)** | **Slot is no longer available:**<br>1. Reservation fails;<br>2. System shows an error and suggests the nearest free slots.<br><br>**Machine is blocked:**<br>1. System does not show the machine's slots as available;<br>2. System shows the block reason to the user. |
| **Postconditions** | Success: time slot is reserved and confirmed by the user.<br>Exception: no reservation is created and the user is notified of failure. |
