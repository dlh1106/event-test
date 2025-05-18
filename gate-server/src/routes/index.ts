import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';

export function setRoutes(app) {
  app.use('/auth', AuthModule);
  app.use('/roles', RolesModule);
}