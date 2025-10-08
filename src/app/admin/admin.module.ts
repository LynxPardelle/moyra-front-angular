import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminGuard } from './admin.guard';

@NgModule({
  declarations: [],
  imports: [CommonModule, AdminRoutingModule],
  exports: [AdminRoutingModule],
  providers: [AdminGuard],
  bootstrap: [],
})
export class AdminModule {}
