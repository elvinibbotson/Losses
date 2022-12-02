function id(el) {
	return document.getElementById(el);
}
'use strict';
// GLOBAL VARIABLES	
var db=null;
var projects=[];
var project=null;
var elements=[]; // elements in project
var element=null;
var layers=[]; // layers in current element
var layer=null;
var combiFraction=1; // used for combi layers
var materials=[]; // all defined materials
var material=null;
var list={};
var currentListItem=null;
var currentDialog=null;
var depth=0; // 0 is project list; 1 is element list; 2 is layer laist
var lastSave=null;
var dragStart={};
// var pseudoLayers=[];
 
// DRAG TO CHANGE DEPTH
id('main').addEventListener('touchstart', function(event) {
    dragStart.x=event.changedTouches[0].clientX;
    dragStart.y=event.changedTouches[0].clientY;
    console.log('touch start at '+dragStart.x);
})

id('main').addEventListener('touchend', function(event) {
    var drag={};
    drag.x=dragStart.x-event.changedTouches[0].clientX;
    drag.y=dragStart.y-event.changedTouches[0].clientY;
    console.log('dragged '+drag.x+'; depth: '+depth);
    if(Math.abs(drag.y)>50) return; // ignore vertical drags
    if((drag.x<-50)&&(depth>0)) { // drag right to go back...
        depth--;
        console.log('bck to depth '+depth);
        if(depth>0) loadElements(); // back to elements...
        else loadProjects(); // ...or projects list
    }
})

// TAP ON HEADER
id('header').addEventListener('click',function() {
	console.log('depth: '+depth);
	switch(depth) {
		case 0: // projects list - can backup/restore data
			showDialog('dataDialog',true);
			break;
		case 1: // elements list - can set project name, temperature delta & exposure category
			id('projectDialogTitle').innerText='project';
			id('projectName').value=project.name;
			id('delta').value=project.delta;
			id('exposure').value=project.exposure;
			id('saveProject').style.display='block';
			id('addProject').style.display='none';
			id('deleteProject').style.display='block';
			showDialog('projectDialog',true);
			break;
		case 2: // layers list - can rename, resize or delete element
			id('elementDialogTitle').innerText='element';
			id('elementName').value=element.name;
			// id('elementType').value=element.type;
			// id('elementType').disabled=true;
			id('elementArea').value=element.area;
			id('addElement').style.display='none';
			id('saveElement').style.display='block';
			id('deleteElement').style.display='block';
			showDialog('elementDialog',true);
	}
	
});

// SHOW/HIDE DIALOG
function showDialog(dialog,show) {
    console.log('show '+dialog+': '+show);
    if(currentDialog) id(currentDialog).style.display='none';
    if(show) {
        id(dialog).style.display='block';
        currentDialog=dialog;
    }
    else {
        id(dialog).style.display='none';
        currentDialog=null;
    }
}

id('newButton').addEventListener('click',function(){
	switch(depth) {
		case 0: // add new project
			id('projectDialogTitle').innerText='add new project';
			id('projectName').value='';
			id('delta').value=20;
			id('exposure').value='moderate';
			id('saveProject').style.display='none';
			id('addProject').style.display='block';
			id('deleteProject').style.display='none';
			showDialog('projectDialog',true);
			break;
		case 1: // add new element to project
			console.log('add new element to project '+project.id);
			element={};
			element.project=project.id;
			id('elementName').value=''; // set up element form
			id('elementArea').value='';
			id('uVal').style.display='none'; // overriden if choose opening element
			id('addElement').style.display='block';
			id('saveElement').style.display='none';
			id('deleteElement').style.display='none';
			showDialog('addElementDialog',true);
			break;
		case 2:
			console.log('add new layer to element '+element.id);
			showDialog('addLayerDialog',true); // add new layer to element
	}
})

id('addProject').addEventListener('click',function() {
	project={};
	project.name=id('projectName').value;
	project.delta=id('delta').value;
	project.exposure=id('exposure').value;
	project.watts=0; // heat loss for project will be calculated later
	console.log('create new project, '+project.name);
	var dbTransaction=db.transaction('projects',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('projects');
	console.log("database ready");
	var addRequest=dbObjectStore.add(project);
	addRequest.onsuccess=function(event) {
		console.log('new project saved');
		showDialog('projectDialog',false);
		loadProjects();
	}
	addRequest.onerror=function(event) {
		console.log('save new project failed');
	}
})
id('saveProject').addEventListener('click',function() {
	// like addProject but save instead of add to database
	project.name=id('projectName').value;
	project.delta=id('delta').value;
	project.exposure=id('exposure').value;
	var dbTransaction=db.transaction('projects',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('projects');
	console.log("database ready");
	putRequest=dbObjectStore.put(project);
	putRequest.onsuccess=function() {
		console.log('project saved');
		showDialog('projectDialog',false);
		loadProjects();
	}
	putRequest.onerror=function() {
		console.log('project save failed');
	}
})
id('deleteProject').addEventListener('click',function() {
	var dbTransaction=db.transaction('projects',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('projects');
	console.log("database ready");
	var deleteRequest=dbObjectStore.delete(project.id);
	deleteRequest.onsuccess=function(event) {
		console.log('project deleted - now delete elements');
		dbTransaction=db.transaction('elements',"readwrite");
		dbObjectStore=dbTransaction.objectStore('elements');
		for(var i in elements) {
			elDelRequest=dbObjectStore.delete(elements[i].id);
			elDelRequest.onsuccess=function(){
				console.log('element '+elements[i].id+' deleted');
			}
			elDelRequest.onerror=function(){
				console.log('element delete failed');
			}
		}
		showDialog('projectDialog',false);
		loadProjects();
	}
	deleteRequest.onerror=function(event) {
		console.log('delete roject failed');
	}
})
id('cancelProject').addEventListener('click',function() {
	showDialog('projectDialog',false);
})

id('wall').addEventListener('click',function() {
	element.type='wall';
	id('elementDialogTitle').innerText='add new wall element';
	showDialog('elementDialog',true);
})
id('roof').addEventListener('click',function() {
	element.type='roof';
	id('elementDialogTitle').innerText='add new roof element';
	showDialog('elementDialog',true);
})
id('floor').addEventListener('click',function() {
	element.type='floor';
	id('elementDialogTitle').innerText='add new floor element';
	showDialog('elementDialog',true);
})
id('opening').addEventListener('click',function() {
	element.type='opening';
	id('elementDialogTitle').innerText='add new opening element';
	id('uVal').style.display='block'; // openings have no layers - just a U-value
	showDialog('elementDialog',true);
})
id('cancelAddElement').addEventListener('click',function() {
	showDialog('addElementDialog',false);
})

// ELEMENT
/*id('elementR').addEventListener('click',function() {
	// repopulate list with this element's layers (just internal surface resistance initially)
	var name=id('elementName').value;
	console.log('show layer list for element '+name);
	id('headerTitle').innerText=name;
	id('headerValue').innerText='kW/m2K';
	// populate layerList
	if(element===null) { // new element - start with internal surface resistance
		layer={};
		layer.name='internal surface resistance';
		// value depends on element type
		// set layer.id when save to layers database
		// when save new element set all layer.owners to its id
	}
	else { // get all layers with current element.id as owner
		
	}
	id('list').innerHTML='';
	showDialog('elementDialog',false);
})*/
id('addElement').addEventListener('click',function() {
	element.name=id('elementName').value;
	element.area=id('elementArea').value;
	console.log('add '+element.type+' element '+element.name+' to project '+element.project);
	element.layers=[];
	console.log('create new '+element.type+' element, '+element.name+' area '+element.area+'m2');
	if(element.type!='opening') { // except openings first layer  is always...
		layer={}; // ...inner surface...
		layer.material=1; // ...first (pseudo)material
		layer.t=0; // ...no thickness...
		layer.v=0; // ...or vapour resistance
		// pseudoLayers[0]; // ...inner surface
		switch(element.type) { // thermal resistance depends on element type 
			case 'wall':
				layer.r=-0.15;
				break;
			case 'floor':
				layer.r=-0.18;
				break;
			case 'roof':
				layer.r=-0.12;
		}
		element.layers.push(0);
		element.u=-1*element.area/layer.r; // u-value (for surfaces negative r indicates resistance)
	}
	// add basic element to DB
	var dbTransaction=db.transaction('elements',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('elements');
	console.log("database ready");
	var addRequest=dbObjectStore.add(element);
	addRequest.onsuccess=function(event) {
		console.log('basic new element added to database');
		showDialog('elementDialog',false);
		depth++;
		id('headerTitle').innerText=element.type+' '+element.name;
		id('headerValue').innerText='0kW';
		loadLayers();
	}
	addRequest.onerror=function(event) {console.log('error adding new element');};
})
id('saveElement').addEventListener('click',function() {
	// update element in database
})
id('deleteElement').addEventListener('click',function() {
	console.log('delete element '+element.name);
	// delete element in database
	dbTransaction=db.transaction('elements',"readwrite");
	dbObjectStore=dbTransaction.objectStore('elements');
	request=dbObjectStore.delete(element.id);
	request.onsuccess=function(event) {
		console.log('element deleted - delete layers');
		dbTransaction=db.transaction('layers',"readwrite");
		dbObjectStore=dbTransaction.objectStore('layers');
		for(var i in element.layers) {
			request=dbObjectStore.delete(element.layers[i]);
			request.onsuccess=function(event) {
				console.log('layer '+i+' deleted');
			}
		}
	}
	dbTransaction.oncomplete=function(event) {
		showDialog('elementDialog',false);
		loadElements();
	}
})
id('cancelElement').addEventListener('click',function() {showDialog('elementDialog',false);})

id('simple').addEventListener('click',function() {
	id('layerDialogTitle').innerText='add new simple layer';
	combiFraction=1;
	id('material').value=0;
	id('thickness').value='';
	id('fractionLine').style.display='none';
	id('addLayer').style.display='block';
	id('saveLayer').style.display='none';
	id('deleteLayer').style.display='none';
	showDialog('layerDialog',true);
})
id('combi').addEventListener('click',function() {
	id('layerDialogTitle').innerText='add new combi layer';
	combiFraction=0;
	id('material').value=0;
	id('thickness').value='';
	id('fraction').value=0;
	id('fractionLine').style.display='block';
	id('addLayer').style.display='block';
	id('saveLayer').style.display='none';
	id('deleteLayer').style.display='none';
	showDialog('layerDialog',true);
})
id('cancelAddLayer').addEventListener('click',function() {
	showDialog('addLayerDialog',false);
})

id('material').addEventListener('change',function() {
	material=materials[id('material').value];
	console.log('material changed to '+material.name+' - r: '+material.r+' thickness: '+material.t);
	if(material.t>=0) id('thickness').value=material.t;
	else id('thickness').value='';
})

id('addLayer').addEventListener('click',function() {
	layer={};
	layer.material=material.id;
	layer.t=id('thickness').value/1000; // convert mm to m
	layer.r=material.r*layer.t;
	layer.v=material.v*layer.t;
	if(combiFraction<1) layer.f=id('fraction').value/100;
	else layer.f=1;
	console.log('save layer '+material.name+'; thickness: '+layer.t+'m; resistance: '+layer.r)
	var dbTransaction=db.transaction('layers',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('layers');
	var request=dbObjectStore.add(layer);
	request.onsuccess=function(event) {
		layer.id=event.target.result;
		console.log('layer added to database: '+layer.id);
		element.layers.push(layer.id);
		dbTransaction=db.transaction('elements',"readwrite");
		dbObjectStore=dbTransaction.objectStore('elements');
		request=dbObjectStore.put(element);
		request.onsuccess=function(event) {
			console.log('element '+element.id+' updated');
			// showDialog('addLayerDialog',false);
			listLayers();
			if(combiFraction<1) { // get second combi layer
				id('layerDialogTitle').innerText='add second combi layer';
				combiFraction=false;
				id('thickness').value=layer.t*1000;
				id('thickness').disabled=true;
				combiFraction=id('fraction').value=(1-layer.f)*100;
				id('fraction').disabled=true;
				id('material').value=0;
				// showDialog('layerDialog',true);
			}
			else {
				id('thickness').disabled=false;
				id('fraction').disabled=false;
				showDialog('addLayerDialog',false);
			}
		}
		request.onerror=function(event) {
			console.log('update element failed');
		}
	}
	request.onerror=function(event) {
		console.log('add new layer failed');
	} 
})

id('cancelLayer').addEventListener('click',function() {
	showDialog('layerDialog',false);
})

function loadMaterials() {
	materials=[];
	var dbTransaction=db.transaction('materials',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('materials');
	request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {
		var cursor=event.target.result;
		if(cursor) {
			materials.push(cursor.value);
			console.log("material id: "+cursor.value.id+": "+cursor.value.name+"; resistance: "+cursor.value.r+"; "+cursor.value.name);
			cursor.continue ();
		}
		else {
			if(materials.length<1) seedMaterials();
			id('material').innerHTML=''; // clear and repopulate materials selector
			var opt;
			for(var i in materials) {
				opt=document.createElement('option');
				opt.value=i;
				opt.innerText=materials[i].name;
				id('material').appendChild(opt);
			}
			loadProjects();
		}
	}
	request.onerror=function(event) {
		console.log('failed to load materials');
	}
}
		
function seedMaterials() {
	materials=[{'name':'inner surface','r':0.1,'v':0,'t':0},
		{'name':'ventilated cavity','r':0.1,'v':0,'t':-1},
		{'name':'closed cavity','r':0.1,'v':0,'t':-1},
		{'name':'ground','r':0.1,'v':0,'t':0},
		{'name':'outer surface','r':0.1,'v':0,'t':0},
		{'name':'concrete','r':0.69,'v':200,'t':-1},
		{'name':'lightweight concrete','r':2.4,'v':50,'t':-1},
		{'name':'aerated concrete blockwork','r':4.5,'v':50,'t':-1},
		{'name':'brick outer leaf','r':1.19,'v':50,'t':-1},
		{'name':'stone','t':0.7,'v':50,'t':-1},
		{'name':'lightweight plaster','r':6.24,'v':50,'t':-1},
		{'name':'plasterboard','r':6.24,'v':50,'t':-1},
		{'name':'timber','r':6.93,'v':50,'t':-1},
		{'name':'plywood','r':6.93,'v':1500,'t':-1},
		{'name':'osb','r':7.7,'v':1000,'t':-1},
		{'name':'fibreboard','r':16,'v':25,'t':-1},
		{'name':'glass','r':0.95,'v':50000,'t':-1},
		{'name':'breather membrane','r':0,'v':0.1,'t':0},
		{'name':'polythene','r':0,'v':500,'t':0},
		{'name':'mineral wool','r':25.6,'v':1,'t':-1},
		{'name':'expanded polystyrene','r':27.7,'v':200,'t':-1},
		{'name':'foamed polyurethene','r':38.5,'v':100,'t':-1},
		{'name':'polyisocyanurate','r':45,'v':150,'t':-1}];
		// r<0: r=-R thermal resistance*-1; v<0: v=-V vapour resistance*-1; t=-1: variable thickness
	console.log('save '+materials.length+' seed materials');
	var dbTransaction=db.transaction('materials',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('materials');
	for(var i in materials) {
		console.log('save material '+i+': '+materials[i].name);
		request=dbObjectStore.add(materials[i]);
		request.onsuccess=function(event) {
			console.log(materials[i].name+' saved');
		}
		request.onerror=function(event) {console.log('failed to save '+materials[i].name);}
	}
}

function loadProjects() {
	projects=[];
	var dbTransaction=db.transaction('projects',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('projects');
	request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {
		var cursor=event.target.result;
		if(cursor) {
			projects.push(cursor.value);
			console.log("project id: "+cursor.value.id+"; "+cursor.value.name);
			cursor.continue ();
		}
		else {
			console.log("No more projects! "+projects.length+" loaded");
			depth=0;
			if(projects.length<1) { // no data: restore backup?
				console.log("no data - restore backup?");
				showDialog('importDialog',true);
			}
			else { // monthly backups
				var today=new Date();
				console.log('this month: '+today.getMonth()+"; last save: "+lastSave);
				if(today.getMonth()!=lastSave) backup();
			}
			listProjects();
		}
	}
}

function listProjects() {
	var listItem;
	id('headerTitle').innerText='projects';
	id("list").innerHTML=""; // clear list
	for(var i in projects) {
		project=projects[i];
		listItem=document.createElement('li');
		listItem.index=i;
		listItem.innerText=project.name;
		listItem.addEventListener('click',function() {
			project=projects[this.index];
			depth=1;
			// id('headerTitle').innerText=project.name;
			// depth++;
			loadElements();
		})
		id('list').appendChild(listItem);
	}
}

function loadElements() {
	project.watts=0;
	elements=[];
	console.log('load elements for project '+project.id+' ('+project.name+')');
	var dbTransaction=db.transaction('elements',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('elements');
	request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {
		var cursor=event.target.result;
		if(cursor) {
			if(cursor.value.project==project.id) {
				elements.push(cursor.value);
				console.log("element id: "+cursor.value.id+"; type: "+cursor.value.type+"; "+cursor.value.name);
			}
			cursor.continue ();
		}
		else {
			console.log("No more elements! "+elements.length+" loaded");
		}
		listElements();
	}
	request.onerror=function(event) {console.log('no elements loaded');}
}

function listElements() {
	console.log('list '+elements.length+' elements for project '+project.id);
	var listItem;
	id("list").innerHTML=""; // clear list
	id('headerTitle').innerText=project.name;
	var watts=0;
	for(var i in elements) {
		element=elements[i];
		listItem=document.createElement('li');
		listItem.index=i;
		listItem.innerText=element.name+' ('+element.type+')';
		watts+=element.area*element.u*project.delta;
		listItem.addEventListener('click',function() {
			element=elements[this.index];
			depth=2;
			// id('headerTitle').innerText=element.type+' '+element.name;
			// id('headerValue').innerText='0kW';
			loadLayers();
		})
		id('list').appendChild(listItem);
	}
	id('headerValue').innerText=Math.round(watts/100)/10+'kW';
}

function loadLayers() {
	layers=[];
	console.log('load layers for element '+element.id+' ('+element.name+')');
	var dbTransaction=db.transaction('layers',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('layers');
	var request;
	for(var i in element.layers) {
		/*
		if(i<1) {
			layer=pseudoLayers[i*-1];
			layers.push(layer);
			console.log('pseudoElement loaded - '+'layer '+i);
		}
		else {
		*/
		request=dbObjectStore.get(element.layers[i]);
		request.onsuccess=function(event) {
				layer=event.target.result;
				console.log('layer '+i+': '+layer.material); 
				layer.name=materials[layer.material-1].name;
				layers.push(layer);
				console.log('layer '+i+' loaded');
			}
		request.onerror=function(event) {
				console.log('loading layer '+i+' failed');
			}
		// }
	}
	dbTransaction.oncomplete=function(event) {
		console.log('layers loaded - list them');
		listLayers();
	}
}

function listLayers() {
	console.log('list layers for element '+element.name+' area: '+element.area+'; u=value: '+element.u);
	var r=0; // element resistance
	var listItem;
	id('headerTitle').innerText=element.name;
	id('headerValue').innerText=Math.round(element.u*element.area)+'W';
	id("list").innerHTML=""; // clear list
	for(var i in layers) {
		layer=layers[i];
		console.log('layer '+i+': '+layer.name+'; t: '+layer.t+'; r: '+layer.r);
		listItem=document.createElement('li');
		listItem.index=i;
		var html='<span class="item-t">'+layer.t*1000+'mm</span><span class="item-f">';
		if(layer.f<1) html+=layer.f*100+'%';
		else html+=' ';
		html+='</span><span class="item-text">'+layer.name+'</span><span class="item-r">';
		if(layer.r<0) r-=layer.r; // negative r represents resistance...
		else r=layer.t*layer.r; // ...otherwise resistivity
		console.log('layer.r: '+layer.r+'; r: '+r);
		r=Math.round(r*1000)/1000;
		html+=r+'</span>';
		console.log('r: '+r+'; item html: '+html);
		listItem.innerHTML=html;
		// add click action
		id('list').appendChild(listItem);
	}
	
} 

// DATA
id('dataBackup').addEventListener('click',function() {showDialog('dataDialog',false); backup();});
id('dataImport').addEventListener('click',function() {showDialog('importDialog',true)});
id('dataCancel').addEventListener('click',function() {showDialog('dataDialog',false)});

// RESTORE BACKUP
id("fileChooser").addEventListener('change', function() {
	var file=id('fileChooser').files[0];
	console.log("file: "+file+" name: "+file.name);
	var fileReader=new FileReader();
	fileReader.addEventListener('load', function(evt) {
		console.log("file read: "+evt.target.result);
	  	var data=evt.target.result;
		var json=JSON.parse(data);
		console.log("json: "+json);
		var items=json.items;
		console.log(items.length+" items loaded");
		var dbTransaction=db.transaction('items',"readwrite");
		var dbObjectStore=dbTransaction.objectStore('items');
		for(var i=0;i<items.length;i++) {
			console.log("save "+items[i].text);
			var request=dbObjectStore.add(items[i]);
			request.onsuccess=function(e) {
				console.log(items.length+" items added to database");
			};
			request.onerror=function(e) {console.log("error adding item");};
		}
		showDialog('importDialog',false);
		alert("data imported - restart");
  	});
  	fileReader.readAsText(file);
});

// CANCEL RESTORE
id('cancelImport').addEventListener('click', function() {
    showDialog('importDialog',false);
});

// BACKUP
function backup() {
  	console.log("EXPORT");
	var fileName="watt";
	var date=new Date();
	fileName+=date.getFullYear();
	fileName+=(date.getMonth()+1);
	fileName+=date.getDate()+".json";
	var dbTransaction=db.transaction('projects',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('projects');
	console.log("database ready");
	var projects=[];
	var request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {  
		var cursor=event.target.result;  
    		if(cursor) { // read in every item
			    projects.push(cursor.value);
			    cursor.continue();  
    		}
		else {
			console.log(projects.length+" projects");
			var data={'projects': projects};
			// ********* NEED TO ADD elements, layers & materials ********
			var json=JSON.stringify(data);
			var blob=new Blob([json], {type:"data:application/json"});
  			var a=document.createElement('a');
			a.style.display='none';
    		var url=window.URL.createObjectURL(blob);
			console.log("data ready to save: "+blob.size+" bytes");
   			a.href=url;
   			a.download=fileName;
    		document.body.appendChild(a);
    		a.click();
			alert(fileName+" saved to downloads folder");
			var today=new Date();
			lastSave=today.getMonth();
			window.localStorage.setItem('lastSave',lastSave); // remember month of backup
		}
	}
}

/* BUILD LIST OF PSEUDO LAYERS
function listPseudoLayers() {
	var names=['inner surface','ventilated cavity','unventilated cavity','outer surface','ground'];
	var opt=null;
	for(var i in names) {
		layer={};
		layer.name=names[i];
		layer.t=layer.r=layer.v=0;
		layer.f=1;
		pseudoLayers.push(layer);
		opt=document.createElement('option');
		opt.value=names[i];
		opt.innerText=names[i];
		id('pseudoLayers').appendChild(opt);
	}
	console.log(pseudoLayers.length+' pseudoLayers listed');
}
*/

// START-UP CODE
lastSave=window.localStorage.getItem('lastSave');
console.log("last save: "+lastSave);
// load items from database
var request=window.indexedDB.open("wattDB");
request.onsuccess=function (event) {
	db=event.target.result;
	console.log("DB open");
	// listPseudoLayers();
	loadMaterials();
	// list.id=list.owner=null;
};
request.onupgradeneeded=function(event) {
	var dbObjectStore=event.currentTarget.result.createObjectStore("projects",{
		keyPath:'id',autoIncrement: true
	});
	console.log("projects database ready");
	dbObjectStore=event.currentTarget.result.createObjectStore("elements",{
		keyPath:'id',autoIncrement: true
	});
	console.log("elements database ready");
	dbObjectStore=event.currentTarget.result.createObjectStore("layers",{
		keyPath:'id',autoIncrement: true
	});
	console.log("layers database ready");
	dbObjectStore=event.currentTarget.result.createObjectStore("materials",{
		keyPath:'id',autoIncrement: true
	});
	console.log("materials database ready");
}
request.onerror=function(event) {
	alert("indexedDB error code "+event.target.errorCode);
};
	
// implement service worker if browser is PWA friendly
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
} else { //Register the ServiceWorker
	navigator.serviceWorker.register('wattSW.js', {
		scope: '/watt/'
	}).then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}