# Car booking — product rules (v1)

## Scope

- **Fleet**: Two company cars (configurable in DB). Both can be booked for the same time window by different people (different cars).
- **Purpose**: Work-related trips. **Reason** is stored on each booking for team visibility on the calendar and in Slack.

## Who can book

- **Open access**: No accounts or sign-in. Anyone with the link can view the calendar and create bookings using **name**, **vehicle**, and **reason**.

## Booking window

- **Start** and **end** are stored in the DB; the UI shows times in the visitor’s **local** timezone.  
- **Overnight** and **weekend** bookings are allowed unless you tighten this in a future version.

## Overlap policy

- **Per car**: Two bookings for the same `carId` must not overlap in time.  
- Overlap is defined as: `booking1.start < booking2.end AND booking2.start < booking1.end`.  
- **Different cars** may overlap.

## Changes and cancellation

- **Cancellation** is a soft delete (`cancelledAt` set). The API requires the **booker’s name** to match the booking (case-insensitive), as a light check in an open tool.  
- **Editing** is cancel + create new.

## Slack digest

- Digest lines use **booker name** and **reason** from each booking. There is no Slack user mention mapping in v1.

## Notifications

- **Daily digest**: Posted to a Slack channel on a schedule. See `README.md` for `CRON_SECRET` and Slack tokens.
