'use client';

import { Card } from '@/common/apps/shell/Card';
import { AnalyticsSwitch } from './AnalyticsSwitch';

// Privacy page: the analytics switch in the same row style as Settings.
export function ConsentChoice() {
  return (
    <Card className="settings-rows">
      <AnalyticsSwitch />
    </Card>
  );
}
