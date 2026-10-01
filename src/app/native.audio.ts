import { Injectable } from '@angular/core';
import { Media, MediaObject } from '@ionic-native/media/ngx';

@Injectable({
    providedIn:'root'
})
export class AudioPlayer{

    bg:MediaObject;
    shoot:MediaObject;
    explotion:MediaObject;

    constructor(
        private player: Media
    ){
        this.preload();
    }

    private preload(){
        this.bg = this.player.create(' http://localhost/assets/through_space.ogg');
    }

    async play(id){
        switch(id){
            case 'bg':
                this.bg.play();
                break;
            default:
                break;
        }
    }

    async pause(id){
        switch(id){
            case 'bg':
                this.bg.pause();
                break;
            default:
                break;
        }
    }

    async rewind(id){
        switch(id){
            case 'bg':
                this.bg.seekTo(0);
                break;
            default:
                break;
        }
    }
}