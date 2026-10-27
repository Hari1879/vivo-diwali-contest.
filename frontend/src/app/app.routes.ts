import { Routes } from '@angular/router';
import { registeredGuard } from './core/session';
import { RegisterPage } from './contest/register.page';

export const routes: Routes = [
  { path: '', component: RegisterPage, title: 'vivo Diwali Contest' },
  {
    path: 'play',
    canActivate: [registeredGuard],
    loadComponent: () => import('./contest/play.page').then((m) => m.PlayPage),
    title: 'Scratch & Celebrate | vivo Diwali Contest',
  },
  {
    path: 'thank-you',
    loadComponent: () => import('./contest/thank-you.page').then((m) => m.ThankYouPage),
    title: 'Thank You | vivo Diwali Contest',
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
