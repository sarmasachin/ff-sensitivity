#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/ff-sensitivity"
API="$ROOT/api"
ADMIN="$ROOT/admin"

if [[ ! -f "$API/.env" ]]; then
  echo "Missing $API/.env"
  exit 1
fi

read -rsp "Hostinger password for no-reply@sensitivitysettings.com: " SMTP_PASSWORD
echo
read -rsp "New password for sharma.sachinctr@gmail.com: " ADMIN_PASSWORD
echo

if [[ ${#SMTP_PASSWORD} -lt 8 || ${#ADMIN_PASSWORD} -lt 8 ]]; then
  echo "Both passwords must be at least 8 characters."
  exit 1
fi

OTP_SECRET="$(openssl rand -hex 48)"
export SMTP_PASSWORD ADMIN_PASSWORD OTP_SECRET

python3 - <<'PY'
import json
import os
from pathlib import Path

path = Path("/var/www/ff-sensitivity/api/.env")
updates = {
    "SUPERADMIN_EMAIL": "sharma.sachinctr@gmail.com",
    "SUPERADMIN_PASSWORD": os.environ["ADMIN_PASSWORD"],
    "ADMIN_OTP_ENABLED": "false",
    "ADMIN_OTP_SECRET": os.environ["OTP_SECRET"],
    "SMTP_HOST": "smtp.hostinger.com",
    "SMTP_PORT": "465",
    "SMTP_USER": "no-reply@sensitivitysettings.com",
    "SMTP_PASSWORD": os.environ["SMTP_PASSWORD"],
    "SMTP_FROM_EMAIL": "no-reply@sensitivitysettings.com",
    "SMTP_FROM_NAME": "FF Sensitivity Ops",
}

lines = path.read_text().splitlines()
seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0].strip() if "=" in line else ""
    if key in updates:
        out.append(f"{key}={json.dumps(updates[key])}")
        seen.add(key)
    else:
        out.append(line)
for key, value in updates.items():
    if key not in seen:
        out.append(f"{key}={json.dumps(value)}")
path.write_text("\n".join(out) + "\n")
PY

echo "Installing and building API..."
cd "$API"
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

echo "Verifying Hostinger SMTP credentials..."
node <<'NODE'
require("dotenv").config();
const nodemailer = require("nodemailer");
const port = Number(process.env.SMTP_PORT || 465);
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
transport.verify()
  .then(() => console.log("SMTP authentication OK"))
  .catch((error) => {
    console.error("SMTP verification failed:", error.message);
    process.exit(1);
  });
NODE

python3 - <<'PY'
from pathlib import Path

path = Path("/var/www/ff-sensitivity/api/.env")
lines = path.read_text().splitlines()
lines = [
    'ADMIN_OTP_ENABLED="true"' if line.startswith("ADMIN_OTP_ENABLED=") else line
    for line in lines
]
path.write_text("\n".join(lines) + "\n")
PY

echo "Updating admin password and revoking old sessions..."
node <<'NODE'
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
(async () => {
  const admin = await prisma.admin.update({
    where: { email: process.env.SUPERADMIN_EMAIL },
    data: {
      passwordHash: await bcrypt.hash(process.env.SUPERADMIN_PASSWORD, 12),
      mustChangePassword: false,
    },
  });
  await prisma.adminSession.updateMany({
    where: { adminId: admin.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  console.log(`Password updated: ${admin.email}`);
})()
  .finally(() => prisma.$disconnect());
NODE

echo "Building admin..."
cd "$ADMIN"
npm ci
npm run build

echo "Reloading only FF Ops processes..."
pm2 reload ff-ops-api --update-env
pm2 reload ff-ops-admin --update-env
pm2 save

unset SMTP_PASSWORD ADMIN_PASSWORD OTP_SECRET

echo "OTP deployment complete."
pm2 list
