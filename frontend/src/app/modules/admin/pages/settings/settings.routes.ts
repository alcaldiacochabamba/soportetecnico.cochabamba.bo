import { Routes } from '@angular/router';
import { SettingsComponent } from 'app/modules/admin/pages/settings/settings.component';
import { SettingsPlanBillingComponent } from 'app/modules/admin/pages/settings/plan-billing/plan-billing.component';

export default [
    {
        path     : '',
        component: SettingsComponent,
        children : [
            {
                path     : 'plan-billing',
                component: SettingsPlanBillingComponent
            }
        ]
    },
] as Routes;
