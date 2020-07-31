let peerConnections = [];

let current_conference_id;
let current_user_id;
let recorder;
let recordedBlobs;
let isHost = true;
let global_current_user;
let streamm;
window.stream = "";

const errorMsgElement = document.querySelector('span#errorMsg');
const recordedVideo = document.querySelector('video#recorded');
const incomingVideo = document.querySelector('video#incoming')
const recordButton = document.querySelector('button#record');
const hostButton = document.querySelector('button#host');
const connectButton = document.querySelector('button#connect');
usernameInput = document.querySelector('input#username');
sessionIdInput = document.querySelector('input#session_id');


recordButton.addEventListener('click', () => {
  if (recordButton.textContent === 'Start Recording') {
    startRecording();
  } else {
    stopRecording();
    recordButton.textContent = 'Start Recording';
    playButton.disabled = false;
    downloadButton.disabled = false;
  }
});

const playButton = document.querySelector('button#play');
playButton.addEventListener('click', () => {
  const buffer = new Blob(recordedBlobs, {type: 'video/webm'});
  //recordedVideo.src = null;
  //recordedVideo.srcObject = null;
  //recordedVideo.src = window.URL.createObjectURL(buffer);
  //recordedVideo.controls = true;
  //recordedVideo.play();
});

const downloadButton = document.querySelector('button#download');
downloadButton.addEventListener('click', () => {
  const blob = new Blob(recordedBlobs, {type: 'video/webm'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'test.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
});

function handleDataAvailable(event) {
  console.log('handleDataAvailable', event);
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function startRecording() {
  recordedBlobs = [];
  let options = {mimeType: 'video/webm;codecs=vp9,opus'};
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    console.error(`${options.mimeType} is not supported`);
    options = {mimeType: 'video/webm;codecs=vp8,opus'};
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.error(`${options.mimeType} is not supported`);
      options = {mimeType: 'video/webm'};
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error(`${options.mimeType} is not supported`);
        options = {mimeType: ''};
      }
    }
  }

  try {
    recorder = new MediaRecorder(window.stream, options);
  } catch (e) {
    console.error('Failed to create Media recorder', e);
    errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
    return;
  }

  console.log('Created MediaRecorder', recorder, 'with options', options);
  recordButton.textContent = 'Stop Recording';
  playButton.disabled = true;
  downloadButton.disabled = true;
  recorder.onstop = (event) => {
    console.log('Recorder stopped: ', event);
    console.log('Recorded Blobs: ', recordedBlobs);
  };
  recorder.ondataavailable = handleDataAvailable;
  recorder.start();
  console.log('MediaRecorder started', recorder);
}

function stopRecording() {
  recorder.stop();
}

function handleSuccess(stream) {
  recordButton.disabled = false;
  console.log('getUserMedia() got stream:', stream);
  window.stream = stream;
  const livecamVideo = document.querySelector('video#livecam');
  livecamVideo.srcObject = stream;
}

async function init(constraints) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    handleSuccess(stream);
  } catch (e) {
    console.error('navigator.getUserMedia error:', e);
    errorMsgElement.innerHTML = `navigator.getUserMedia error:${e.toString()}`;
  }
}

document.querySelector('button#start').addEventListener('click', async () => {
  const constraints = {
    audio: {
    },
    video: {
      width: 1280, height: 720
    }
  };
  console.log('Using media constraints:', constraints);
  await init(constraints);
});


function PeerConnectionAbstraction(l_user_id, r_user_id, initiator, reliability){
          this.reliable = reliability;
          this.local_user_id = l_user_id;
          this.remote_user_id = r_user_id;

          local_user_id = l_user_id;
          remote_user_id = r_user_id;

          if (window.webkitRTCPeerConnection) {
              this.RTCPeerConnection = webkitRTCPeerConnection;
              this.RTCSessionDescription = RTCSessionDescription;
          } else if (window.mozRTCPeerConnection) {
              this.RTCPeerConnection = mozRTCPeerConnection;
              this.RTCSessionDescription = mozRTCSessionDescription;
              RTCIceCandidate = mozRTCIceCandidate;
          }

          if (this.reliable)
              this.dataChannelOptions = {};
          else
              this.dataChannelOptions = { outOfOrderAllowed:true, maxRetransmitNum:0 };
          this.initiatePeerConnection(initiator);
};

PeerConnectionAbstraction.prototype = {
      /** @public methods*/
      setupCall:function () {
          //this.peerConnection.addStream(window.stream);
          xd = this;
          window.stream.getTracks().forEach(track => xd.peerConnection.addTrack(track, window.stream));
          this.peerConnection.createOffer(
              this.setLocalAndSendMessage_,
              function (err) {
                  console.log('createOffer(): failed, ' + err)
              },
              { 'mandatory': { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true } });
      },

      handleMessage:function (message) {
          console.log('handling message:');
          console.log(message)

          try{
            parsed_msg = JSON.parse(message.sdpMessage);
          }catch(err){
            console.log('COULDN\'T PARSE MESSAGE TRYING TO PUT IT LIKE IT IS')
            console.log(err)
            parsed_msg = message.sdpMessage
          }
          console.log(parsed_msg);
          if (parsed_msg.type) {
              var session_description = new this.RTCSessionDescription(parsed_msg);
              var thi$ = this;
              if(!this.peerConnectionStateValid()) return;
              this.peerConnection.setRemoteDescription(
                  session_description,
                  function () {
                      console.log('setRemoteDescription(): success.')
                      if (session_description.type == "offer") {

                          window.stream.getTracks().forEach(track => thi$.peerConnection.addTrack(track, window.stream));
                          console.log('createAnswer with constraints: ' +
                              JSON.stringify({ 'mandatory': { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true } } , null, ' '));
                          if(!thi$.peerConnectionStateValid()) return;
                          thi$.peerConnection.createAnswer(
                              thi$.setLocalAndSendMessage_,
                              function (err) {
                                  console.log('createAnswer(): failed, ' + err)
                              },
                              { 'mandatory': { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true } });
                      }
                  },
                  function (err) {
                      console.log('setRemoteDescription(): failed, ' + err)
                  });

              return;
          } else if (parsed_msg.candidate) {
              if (JSON.stringify(parsed_msg) in this.peerConnection.candidates) {
                  console.log('candidate was already added');
                  return;
              }
              if(!this.peerConnectionStateValid()) return;
              var candidate = new RTCIceCandidate(parsed_msg);
              this.peerConnection.addIceCandidate(candidate);

              this.peerConnection.candidates[JSON.stringify(parsed_msg)] = Date.now();
              return;
          }
          console.log("unknown message received");
          return;
      },


      send:function (binaryMessage) {
          var thi$ = this;
          if (thi$.dataChannel.readyState.toLowerCase() == 'open') {
              console.log("  on dataChannel");
              thi$.dataChannel.send(binaryMessage);
          } else {
              console.log('dataChannel was not ready, setting timeout');
              /*setTimeout(function (dataChannel, binaryMessage) {
                  thi$.send(dataChannel, binaryMessage);
              }, 1000, thi$.dataChannel, binaryMessage);*/
          }
      },
      close:function(){
          this.ready = false;
          this.dataChannel.close();
          this.peerConnection.close();
      },

      /** @private methods*/
      initiatePeerConnection:function (initiator) {
          var thi$ = this;
          this.initiatePeerConnectionCallbacks();
          this.createPeerConnection();
          if (initiator)
              this.ensureHasDataChannel();
          var id = setTimeout(function (thi$) {
              if (!thi$.ready) {
                  console.log("ready state of PCImpl to " + thi$.targetId + " = " + thi$.ready);
                  thi$.failure = true;
                  console.log("couldn't connect to " + thi$.targetId);
                  thi$.handlePeerDisconnection(thi$.targetId);
              }
          }, 20000000, this);
      },
      initiatePeerConnectionCallbacks:function () {
          this.registerEvents();
      },
      registerEvents:function () {
          var thi$ = this;
          this.setLocalAndSendMessage_ = function (session_description) {
              console.log(session_description.sdp);
              thi$.peerConnection.setLocalDescription(
                  session_description,
                  function () {
                      console.log('setLocalDescription(): success.');
                  },
                  function (err) {
                      console.log('setLocalDescription(): failed' + err)
                  });


              console.log("Sending SDP message:\n" + session_description.sdp);
              if(isHost){
                  $.ajax({
                        type: 'POST',
                        url: window.location.href,
                        data:{
                            message_type: 'post_offer',
                            conference_id: current_conference_id,
                            sdp_type: 'offer',
                            csrfmiddlewaretoken: window.csrf_token,
                            user_id: thi$.local_user_id,
                            sdp: session_description.sdp,
                        },
                        success:function(responseJSON){
                            console.log('Sdp message response: ')
                            console.log(responseJSON);
                            window.interval = window.setInterval(attempt_connection, 3000);
                        },
                        error : function(xhr,errmsg,err) {
                            console.log(xhr.status + ": " + xhr.responseText);
                        },
                  });
              }
              else{
                  $.ajax({
                        type: 'POST',
                        url: window.location.href,
                        data:{
                            message_type: 'post_answer',
                            conference_id: current_conference_id,
                            sdp_type: 'answer',
                            csrfmiddlewaretoken: window.csrf_token,
                            user_id: thi$.remote_user_id,
                            sdp: session_description.sdp,
                        },
                        success:function(responseJSON){
                            console.log('Sdp message response: ')
                            console.log(responseJSON);
                        },
                        error : function(xhr,errmsg,err) {
                            console.log(xhr.status + ": " + xhr.responseText);
                        },
                  });
              }
          };

          this.iceCallback_ = function (event) {
              if (event.candidate && event.target.iceConnectionState != 'disconnected') {
                  var sdp_message = event.candidate;
                  console.log(event.candidate)
                  if(event.candidate.candidate!==""){
                      console.log('YES');
                      console.log('THIS IS THE ID: ' + thi$.local_user_id)
                      if(isHost){
                          $.ajax({
                                type:'POST',
                                url:window.location.href,
                                data:{
                                    message_type: 'post_local_candidate',
                                    sdp_type: 'candidate',
                                    conference_id: current_conference_id,
                                    csrfmiddlewaretoken: window.csrf_token,
                                    user_id: thi$.local_user_id,
                                    sdp: JSON.stringify(sdp_message),
                                },
                                success:function(responseJSON){
                                    console.log('Sdp message response: ')
                                    console.log(responseJSON);
                                },
                                error : function(xhr,errmsg,err) {
                                    console.log(xhr.status + ": " + xhr.responseText);
                                },
                          });
                      }
                      else{
                          $.ajax({
                                type:'POST',
                                url:window.location.href,
                                data:{
                                    message_type: 'post_remote_candidate',
                                    sdp_type: 'candidate',
                                    conference_id: current_conference_id,
                                    csrfmiddlewaretoken: window.csrf_token,
                                    user_id: thi$.remote_user_id,
                                    sdp: JSON.stringify(sdp_message),
                                },
                                success:function(responseJSON){
                                    console.log('Sdp message response: ')
                                    console.log(responseJSON);
                                },
                                error : function(xhr,errmsg,err) {
                                    console.log(xhr.status + ": " + xhr.responseText);
                                },
                          });
                      }
                  }
              }
          };

          this.iceStateChangedCallback_ = function (event) {
              if (!!event.target && event.target.iceConnectionState === 'disconnected') {
                  console.log("iceStateChanged to disconnected");
                  thi$.handlePeerDisconnection();
              }

          };

          this.signalingStateChangeCallback_ = function (event) {
              if(event.target && event.target.signalingState == "closed"){
                  console.log("signalingStateChanged to closed");
                  thi$.handlePeerDisconnection();
              }
          };

          this.onCreateDataChannelCallback_ = function (event) {
              if (thi$.dataChannel != null && thi$.dataChannel.readyState != 'closed') {
                  console.log('Received DataChannel, but we already have one.');
              }
              thi$.dataChannel = event.channel;
              console.log('DataChannel with label ' + thi$.dataChannel.label +
                  ' initiated by remote peer.');
              thi$.hookupDataChannelEvents();
          };

          this.onDataChannelReadyStateChange_ = function (event) {
              var readyState = event.target.readyState;
              console.log('DataChannel to ' + thi$.targetId + ' state:' + readyState);
              if (readyState.toLowerCase() == 'open') {
                  console.log('TEST THIS BITCH')
                  console.log(thi$.peerConnection);
                  console.log(window.stream)

                  if(isHost){

                      window.clearInterval(window.interval)
                      peerConnections.push(new PeerConnectionAbstraction(current_user_id,'unknown', true, true));
                      peerConnections[peerConnections.length-1].setupCall()
                      window.interval = window.setInterval(attempt_connection, 3000);
                  }
                  thi$.ready = true;

                  var node = document.createElement("video");
                  console.log('ASDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSSDDSA');
                  console.log(thi$.srcObject)
                  node.srcObject = thi$.srcObject;
                  node.toggleAttribute('autoplay');
                  node.toggleAttribute('playsinline');
                  document.querySelector('#videos').appendChild(node);
              }
          };

          this.onDataChannelClose_ = function (event) {
              console.log("data channel was closed");
              thi$.handlePeerDisconnection();
          };

          this.onMessageCallback_ = function (message) {
              console.log("receiving data on dataChannel");
          };
      },
      ensureHasDataChannel:function () {
          if (this.peerConnection == null)
              console.log('Tried to create data channel, ' +
                  'but have no peer connection.');
          if (this.dataChannel != null && this.dataChannel != 'closed') {
              console.log('Creating DataChannel, but we already have one.');
          }
          this.createDataChannel();
      },
      createPeerConnection:function () {
          var servers = {"iceServers":[{url:"stun:stun.l.google.com:19302"}]}
          try {
              if(window.mozRTCPeerConnection)
                  this.peerConnection = new this.RTCPeerConnection();
              else
                  this.peerConnection = new this.RTCPeerConnection(
                      servers
                  );
              this.peerConnection.candidates = {};
          } catch (exception) {
              console.log('Failed to create peer connection: ' + exception);
          }
          this.peerConnection.onaddstream = this.addStreamCallback_;
          this.peerConnection.onremovestream = this.removeStreamCallback_;
          this.peerConnection.onicecandidate = this.iceCallback_;
          this.peerConnection.oniceconnectionstatechange = this.iceStateChangedCallback_;
          this.peerConnection.onicechange = this.iceStateChangedCallback_;
          this.peerConnection.onsignalingstatechange = this.signalingStateChangeCallback_;
          this.peerConnection.ondatachannel = this.onCreateDataChannelCallback_;
          xd = this;
          this.peerConnection.ontrack = function(event){
              console.log('DOES THIS EVEN LIKE HAPPEN')
              console.log(event)
              xd.srcObject = event.streams[0];
              console.log('pc received remote stream', event);
          }
      },
      createDataChannel:function () {
          console.log("createDataChannel");
          this.dataChannel = this.peerConnection.createDataChannel(this.label, this.dataChannelOptions);
          this.hookupDataChannelEvents();
      },
      closeDataChannel:function () {
          if (this.dataChannel == null)
              console.log('Closing DataChannel, but none exists.');
          console.log('DataChannel with label ' + this.dataChannel.label + ' is being closed.');
          this.dataChannel.close();
      },
      hookupDataChannelEvents:function () {
          this.dataChannel.binaryType = 'arraybuffer';
          this.dataChannel.onmessage = this.onMessageCallback_;
          this.dataChannel.onopen = this.onDataChannelReadyStateChange_;
          this.dataChannel.onclose = this.onDataChannelClose_;
          console.log('data-channel-status: ' + this.dataChannel.readyState);
      },

      handlePeerDisconnection:function(){

          if(this.dataChannel && this.dataChannel.readyState != "closed"){
              console.log("handling peer disconnection: closing the datachannel");
              this.dataChannel.close();
          }
          if(this.peerConnection.signalingState != "closed"){
              console.log("handling peer disconnection: closing the peerconnection");
              this.peerConnection.close();
          }
          window.clearInterval(window.interval)
          if(connected){
              log('Disconnected');
          }
          connected = false;
      },

      peerConnectionStateValid:function(){
          if(this.peerConnection.iceConnectionState != 'closed' && this.peerConnection.signalingState != 'closed')
              return true;
          else{
              console.log("peerConnection state to " + this.targetId + " is invalid - 'not usable'");
              return false;
          }

      }
}

hostButton.addEventListener('click', () => {
    current_user_id = usernameInput.value;
    connectButton.toggleAttribute('disabled');
    $.ajax({
        type:'POST',
        url:window.location.href,
        data:{
            message_type: 'create_conference',
            sdp_type: 'candidate',
            conference_id: current_conference_id,
            csrfmiddlewaretoken: window.csrf_token,
            user_id: usernameInput.value,
        },
        success:function(responseJSON){
            console.log('Sdp message response: ')
            console.log(responseJSON);
            current_conference_id = responseJSON.conference_id;
            sessionIdInput.setAttribute('value', responseJSON.conference_id);
            console.log('METHOD 1');
            peerConnections.push(new PeerConnectionAbstraction(current_user_id,'unknown', true, true));
            peerConnections[peerConnections.length-1].setupCall()
            window.interval = window.setInterval(attempt_connection, 3000);
            //peerConnections[0].setupCall();
            //start waiting for answer
        },
        error : function(xhr,errmsg,err) {
            console.log(xhr.status + ": " + xhr.responseText);
        },
    });
});

function attempt_connection(){
    console.log(peerConnections[peerConnections.length-1].RTCPeerConnection.signalingState)
    console.log(peerConnections[peerConnections.length-1].dataChannel.readyState)
    console.log(peerConnections[peerConnections.length-1].signalingState)
    if(peerConnections[peerConnections.length-1].dataChannel.readyState == 'connecting'){
        $.ajax({
            type:'GET',
            url:window.location.href,
            data:{
                message_type: 'get_answer_and_candidates',
                csrfmiddlewaretoken: window.csrf_token,
                user_id: local_user_id,
                conference_id: current_conference_id,
            },
            success:function(responseJSON){
                console.log('Sdp message response: ')
                console.log(responseJSON)
                if (responseJSON['err']){
                    console.log('Try again')
                }
                else{
                    var answer = responseJSON['answer']
                    //answer.sdpMessage = JSON.parse(answer.sdpMessage)
                    peerConnections[peerConnections.length-1].handleMessage(answer)
                    responseJSON['ice_candidates'].forEach(function(candidate){
                        console.log('CANNNDIDATE')
                        console.log(candidate)
                        //candidate.sdpMessage = JSON.parse(candidate.sdpMessage)
                        peerConnections[peerConnections.length-1].handleMessage(candidate)
                    })
                }
            },
            error : function(xhr,errmsg,err) {
                console.log(xhr.status + ": " + xhr.responseText);
            },
        });
    }
}

let total_users, users_cnt;

connectButton.addEventListener('click', () => {
    current_conference_id = sessionIdInput.value;
    current_user_id = usernameInput.value;
    isHost = false;
    //connect to every peer
    //open connection for next peer
    $.ajax({
        type:'GET',
        url:window.location.href,
        data:{
            message_type: 'get_session_users',
            conference_id: current_conference_id,
            csrfmiddlewaretoken: window.csrf_token,
        },
        success:function(responseJSON){
            console.log('USERS')
            console.log('USERS' + responseJSON.users)
            total_users = responseJSON.users.length
            users_cnt = 0;
            responseJSON.users.forEach((user)=>{
                //open connection for next peer
                $.ajax({
                    type:'GET',
                    url:window.location.href,
                    data:{
                        message_type: 'get_offer_and_candidates',
                        user_id : user,
                        conference_id: current_conference_id,
                        csrfmiddlewaretoken: window.csrf_token,
                    },
                    success:function(responseJSON){
                        console.log('METHOD 3');
                        peerConnections.push(new PeerConnectionAbstraction(responseJSON.user, current_user_id, false, true));
                        console.log('ERIKA')
                        console.log(responseJSON.user)
                        global_current_user = responseJSON.user;
                        peerConnections[peerConnections.length-1].handleMessage(responseJSON.offer);
                        responseJSON.ice_candidates.forEach(function(ic){
                            peerConnections[peerConnections.length-1].handleMessage(ic)
                        })
                    },
                    error : function(xhr,errmsg,err) {
                        console.log(xhr.status + ": " + xhr.responseText);
                    },
                });
            })

            setTimeout(function () {
                window.clearInterval(window.interval)
                console.log('METHOD 2')
                peerConnections.push(new PeerConnectionAbstraction(current_user_id, 'unknown', true, true));
                peerConnections[peerConnections.length-1].setupCall()
                isHost = true;
                window.interval = window.setInterval(attempt_connection, 3000);
            }, 3000);
        },
        error : function(xhr,errmsg,err) {
            console.log(xhr.status + ": " + xhr.responseText);
        },
    });
});

