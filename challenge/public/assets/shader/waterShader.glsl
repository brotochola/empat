precision mediump float;

varying vec2 vTextureCoord; // The texture coordinates from the vertex shader

// Time-based parameter (you'll need to set this in your shader pipeline)
uniform float iGlobalTime;
uniform sampler2D iChannel0;



uniform vec2 resolution;


varying vec2 fragCoord;

void main() {
    vec2 uv = fragCoord / resolution.xy;

    vec4 pixel = texture2D(iChannel0, uv);

    gl_FragColor = vec4(uv.xyx * pixel.rgb, 1.0);
}


// Main fragment shader
void main() {
    // Create displacement effect using sine and cosine functions based on the fragment's position and time
    float waveAmplitude = 0.05; // Amplitude of the wave displacement
    float waveFrequency = 0.1;  // Frequency of the wave
    
    // Calculate displacement based on texture coordinates and time
    float displacementX = sin(vTextureCoord.y * 10.0 + iGlobalTime * waveFrequency) * waveAmplitude;
    float displacementY = cos(vTextureCoord.x * 10.0 + iGlobalTime * waveFrequency) * waveAmplitude;

    // Apply the displacement to the texture coordinates
    vec2 displacedCoord = vTextureCoord + vec2(displacementX, displacementY);

    // Sample the texture with the displaced coordinates
    gl_FragColor = texture2D(uSampler, displacedCoord);
}