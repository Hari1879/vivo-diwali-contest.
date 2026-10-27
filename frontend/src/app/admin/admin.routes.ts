import { Routes } from '@angular/router';
import { adminGuard } from '../core/auth';
import { AdminShell } from './shell';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login.page').then((m) => m.LoginPage),
    title: 'Admin Login | vivo Diwali Contest',
  },
  {
    path: '',
    component: AdminShell,
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard.page').then((m) => m.DashboardPage),
        title: 'Dashboard | Admin',
      },
      {
        path: 'entries',
        loadComponent: () => import('./entries.page').then((m) => m.EntriesPage),
        title: 'Entries | Admin',
      },
      {
        path: 'imeis',
        loadComponent: () => import('./imeis.page').then((m) => m.ImeisPage),
        title: 'IMEI List | Admin',
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings.page').then((m) => m.SettingsPage),
        title: 'Settings | Admin',
      },
    ],
  },
];
