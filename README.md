# ERS (Emergency Response System)

This iteration simplifies ERS for fast emergency dispatch:

- Victim-first default home page at `/` with one-tap SOS buttons.
- Department-based auto-assignment (Fire, Assault, Medical, Other).
- Realtime updates across victim, rescuer, admin, and analytics pages.
- Hold-to-talk PTT for victim, rescuer, and admin incident view.
- Mandatory profile completion flow (`age`, `gender`, `blood_group`, `phone`) on first login when missing.
- Rescuer online/offline toggle only, with server-derived `on scene` signal.

## Roles

- `admin`
- `rescuer`
- `victim`

`observer` role is removed.

## Removed In This Iteration

- Stealth mode
- Heatmap overlay and heatmap analytics endpoint
- Battery saver mode
- Offline queue and relay cache flow
- Incident merge/split flow
- Rescuer-side SOS incident creation flow

## Environment

Use `.env.example` as base.

Important values:

- `PORT=4000`
- `MONGO_URI=mongodb://localhost:27017/ers`
- `JWT_SECRET=change_this_jwt_secret`
- `STORAGE_PATH=./uploads`

Optional:

- `ONSCENE_RADIUS_METERS=30`

## Run Locally

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Seed users:

```bash
cd backend
node ../scripts/seed.js
```

Default seed accounts:

- `rescuer1@ers.test` / `rescuerpass` (department: Fire)
- `rescuer2@ers.test` / `rescuerpass` (department: Medical)
- `victim1@ers.test` / `victimpass`

Hardcoded admin login:

- `admin@ers.com` / `admin123`

## Quick Test Checklist

1. Quick SOS from Victim Home
- Open `http://localhost:5173/`
- Press one SOS button (Fire/Assault/Medical/Other)
- Confirm incident is created and message appears.

2. Auto-assignment by department
- Ensure a rescuer is logged in and toggled `online` in Rescuer Panel.
- Send SOS with matching department.
- Verify incident gets `assignedRescuer` automatically.
- For unmatched/no-online rescuer, victim sees: `No rescuer available for [department] right now. Help notified.`

3. PTT hold-to-talk
- Open same incident context as victim/rescuer/admin.
- Join channel and hold the PTT button to talk.
- Release to stop.
- Verify realtime transcript entries with `speakerType` and timestamp.

4. Admin incident details + responder action tab
- Open `/admin` as admin.
- Select an incident.
- Verify victim details, assigned rescuer details, and live victim/rescuer location updates.
- Use `View Evidence` to inspect uploaded media.
- Use `Mark Completed` to resolve incident and remove it from active list.

## Realtime Events

- `incident:new`
- `incident:assigned`
- `victim:location_update`
- `rescuer:location_update`
- `rescuer:onscene`
- `incident:completed`
- `ptt:start`
- `ptt:stop`
- `transcript:new`

## Tests

Backend smoke tests:

```bash
cd backend
npm test
```

Frontend smoke tests:

```bash
cd frontend
npm test
```
