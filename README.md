# viinex20-rlwswitchcfg

This is a configuration for Viinex 2.0 (https://www.viinex.com) which allows the usage of a railcar ID recognition system based on Viinex Foundation 1.4 for a weigh bridge with 2 poles (on the left and on the right of the bridge), with two recognition cameras at each pole.

The script in Viinex 2.0 reads the digital input from an infrared sensor at each pole, and decides where the train is coming from. It generates an appropriate API calls for Viinex 1.4 (via the simple utility whose source code and executable is provided), and switches the virtual video sources to the cameras at appropriate pole.

After the train passes, the script reverts everything as it was before the train arrived.

There are two types of virtual video sources in Viinex 2.0: renderers and stream switches. Renderers decode the original video streams, and encode a derivateive stream. It looks well, we can also combine two cameras in the same virtual cam when there is no train (to see the cameras on both the left and right poles). But it consumes a lots of CPU. The stream switches just switch H.264 streams between two or more original video sources. 

There are two parts of config provided for both of these options: the renderers.json and vcams.json respectively. Generally one only need one of them. Just rename the other file (the one which is not needed) into *.json_

In Viinex 1.4 configuration, you'll only need two video sources (for top and bottom virtual camera). They should be set to

rtsp://127.0.0.1:1554/vcam1
rtsp://127.0.0.1:1554/vcam2

if stream switches are used, or

rtsp://127.0.0.1:1554/rend1
rtsp://127.0.0.1:1554/rend2

if renderers are used.
