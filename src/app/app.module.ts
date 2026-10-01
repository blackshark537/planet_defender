import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { Media } from '@ionic-native/media/ngx';

import { AppComponent } from './app.component';
import { AudioPlayer } from './native.audio';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [AudioPlayer, Media],
  bootstrap: [AppComponent]
})
export class AppModule { }
