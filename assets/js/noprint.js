if (noCopy) 
{ 
	document.body.oncopy = function(){return false}; 
	document.body.oncontextmenu = function(){return false}; 
	document.body.onselectstart = document.body.ondrag = function(){
	    return false;
	}
 	document.onkeydown = function() {
		if((event.ctrlKey == true || event.metaKey == true) && event.keyCode == 83) {
			event.preventDefault();
		}
		if((event.ctrlKey == true || event.metaKey == true) && event.code == 83) {
			event.preventDefault();
		}
	}
}

if (noPrint) 
{     
   var c=document.createElement("span");
   c.style.display="none";
   c.style.postion="absolute";
   c.style.background="#000";
	var first=document.body.firstChild;
	var wraphtml=document.body.insertBefore(c,first);
  c.setAttribute('width', document.body.scrollWidth);
  c.setAttribute('height', document.body.scrollHeight);
 	c.style.display="block";
 	var cssNode3 = document.createElement('style'); 
	cssNode3.type = 'text/css'; 
	cssNode3.media = 'print'; 
	cssNode3.innerHTML ='body{display:none}';
		document.head.appendChild(cssNode3); 	
}         	
	
var cssNode2 = document.createElement('style'); 
cssNode2.type = 'text/css'; 
cssNode2.media = 'screen'; 
cssNode2.innerHTML ='div{-webkit-touch-callout: none;-webkit-user-select: none;-khtml-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none;}';
document.head.appendChild(cssNode2);
document.body.style.cssText="-webkit-touch-callout: none;-webkit-user-select: none;-khtml-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none;";
 	

function toBlur()
{
	if (autoBlur){
		document.getElementById("pageWrapper").style.cssText="-webkit-filter: blur(5px);-moz-filter: blur(5px);-ms-filter: blur(5px);-o-filter: blur(5px);filter: blur(5px);";
		document.getElementById("pageMessage").style.cssText="display: flex;position: fixed;top:0;right:0;bottom:0;left:0;align-items: center;";
	}
	
}

function toClear()
{
	document.getElementById("pageWrapper").style.cssText="-webkit-filter: unset;-moz-filter: unset;-ms-filter: unset;-o-filter: unset;filter: unset;";
	document.getElementById("pageMessage").style.cssText="display: none;";
}

document.onclick = function(event){
 	toClear();
}
 
document.onmouseleave = function(event){
	toBlur();
}

document.onblur = function(event){
 	toBlur();
}

document.addEventListener('keyup', (e) => {
    if (e.key == 'PrintScreen') {
    	if (noScreenshot)
    	{
        navigator.clipboard.writeText('');
        
      }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key == 'p') {
        if (noPrint)
	    	{
	        e.cancelBubble = true;
	        e.preventDefault();
	        e.stopImmediatePropagation();
	      }
    }
});