// Vertex Shader

attribute vec2 aVertexPosition; // The position of each vertex in the mesh
attribute vec2 aTexCoord; // The texture coordinates for the sprite (set by Phaser)

varying vec2 vTextureCoord; // Varying to pass to the fragment shader

void main() {
    // Pass the texture coordinates to the fragment shader
    vTextureCoord = aTexCoord;

    // Set the position of the vertex
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);
}
