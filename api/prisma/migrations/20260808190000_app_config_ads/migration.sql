-- Calculate Best Pro Settings rewarded ads remote control
-- buttonLabel uses \u00b7 (middle dot) to avoid encoding corruption in SQL tools
ALTER TABLE "app_config"
ADD COLUMN "ads_json" JSONB NOT NULL DEFAULT '{
  "calculate": {
    "enabled": true,
    "cooldownHours": 24,
    "incompleteMessage": "Watch the full ad to see your settings.",
    "buttonLabel": "Calculate Best Pro Settings \u00b7 Watch Ad"
  }
}'::jsonb;
