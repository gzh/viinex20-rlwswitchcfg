var config;

var status={
    updated: new Date(),
    train: false,
    pole: null,
    state: false,
    sensors: {}
};

function onload(cfg){
    config = cfg;

    config.sources1 = [];
    config.sources2 = [];
    if(vnx.objects.rend1 != null && vnx.objects.rend2 != null){
        config.sources1 = config.sources1.concat(vnx.objects.rend1.sources());
        config.sources2 = config.sources2.concat(vnx.objects.rend2.sources());
    } else if(vnx.objects.vcam1 != null && vnx.objects.vcam2 != null){
        config.sources1 = config.sources1.concat(vnx.objects.vcam1.sources());
        config.sources2 = config.sources2.concat(vnx.objects.vcam2.sources());
    }
    config.sources1.sort();
    config.sources2.sort();
    
    vnx.log("Railway camera & sensor smart switch script for Viinex 2.0");
    vnx.debug(config);

    updateRenderers();
    updateVcams();
    
    return status;
}

function onevent(e){
    if(e.origin.type != "modbus" || e.topic != "DigitalInput"){
        return;
    }
    var pole = null;
    for(var s in config.pins){
        if(config.pins[s] == e.origin.details.pin){
            pole = s;
            break;
        }
    }
    if(pole==null){
        return;
    }

    if(config.invert){
        e.data.state = !e.data.state;
    }
    
    var send = false;
    var publish = false;

    // maybe start the train
    if(status.pole == null && e.data.state){
        status.pole = pole;
        status.train = true;
        vnx.log("Train arrived at "+status.pole+" pole");
        publish = true;
        updateRenderers();
        updateVcams();
    }

    status.sensors[pole] = e.data.state;
    
    if(status.pole==pole){
        status.updated = e.timestamp;
        publish = true;
        if(status.state != e.data.state){
            status.state = e.data.state;
            send = true;
        }
    }
    else {
        status.updated = e.timestamp;
        publish = true;
    }

    var anySensor=false;
    for(var s in status.sensors)
        anySensor |= status.sensors[s];
    
    if(anySensor){
        vnx.timeout();
    }
    else{
        if(status.train){
            vnx.timeout(config.timeout);
        }
    }

    if(publish){
        vnx.publish(status);
        vnx.log(status);
    }
    if(send){
        vnx.event("DigitalInput", {"state": status.state});
        vnx.log("Virtual DigitalInput pin -> "+status.state);
    }
}

function ontimeout(){
    if(status.state!=false){
        vnx.error("Timeout occured while pin in state 'true'. This is a logic error");
        vnx.debug(status);
    }
    status.updated = new Date();
    vnx.log("train passed (initially arrived at "+status.pole+" pole)");
    status.pole = null;
    status.train = false;
    status.state = false; // though it's a precondition
    vnx.publish(status);
    updateRenderers();
    updateVcams();
}

function updateRenderers(){
    if(vnx.objects.rend1 == null || vnx.objects.rend2 == null)
        return;
    if(status.pole == null){
        var layout = {
            size: config.imgsize,
            viewports: [
                {
                    input: 0,
                    dst: [0,0,0.5,1],
                    src: [0.3,0.1,0.7,0.9]
                },
                {
                    input: 1,
                    dst: [0.5,0,1,1],
                    src: [0.3,0.1,0.7,0.9]
                }
            ]
        };
        vnx.objects.rend1.layout(layout);
        vnx.objects.rend2.layout(layout);
    }
    else {
        var input1=-1, input2=-1;
        var showCams=config.cams[status.pole];
        showCams.forEach(function(cam){
            input1 = Math.max(input1, config.sources1.indexOf(cam));
            input2 = Math.max(input2, config.sources2.indexOf(cam));
        });
        var layout1 = {
            size: config.imgsize,
            viewports: [
                {
                    input: input1,
                    dst: [0,0,1,1]
                }
            ]
        };
        var layout2 = {
            size: config.imgsize,
            viewports: [
                {
                    input: input2,
                    dst: [0,0,1,1]
                }
            ]
        };
        vnx.objects.rend1.layout(layout1);
        vnx.objects.rend2.layout(layout2);
    }
}

function updateVcams(){
    if(vnx.objects.vcam1 == null || vnx.objects.vcam2 == null){
        //vnx.log("##################################################vcams not found");
        return;
    }
    if(status.pole == null){
        vnx.objects.vcam1.input(0);
        vnx.objects.vcam2.input(0);
        //vnx.log("##################################################vcams reset 0 0 ");
    }
    else{
        var input1=-1, input2=-1;
        //vnx.log("##################################################vcams very before set "+input1+" "+input2);
        var showCams=config.cams[status.pole];
        showCams.forEach(function(cam){
            input1 = Math.max(input1, config.sources1.indexOf(cam));
            input2 = Math.max(input2, config.sources2.indexOf(cam));
        });
        //vnx.log("##################################################vcams before set "+input1+" "+input2);
        vnx.objects.vcam1.input(input1);
        vnx.objects.vcam2.input(input2);
        //vnx.log("##################################################vcams set "+input1+" "+input2);
    }
}
