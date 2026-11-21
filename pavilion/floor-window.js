import {headquarters} from './floor.js';
import {registry} from './site.js';
import {mountFloor} from './iso-player.js';

if(parent!==window&&typeof parent.readFloorBranch==='function'){
 const frame=window.frameElement,side=frame.dataset.side;
 const {model,day}=parent.readFloorBranch(side);
 document.body.innerHTML=headquarters(model,day,registry,[]);
 for(const details of document.querySelectorAll('details'))details.open=false;
 await mountFloor(model,day,new URLSearchParams('beat=0'));
 parent.floorBranchReady(side);
}
