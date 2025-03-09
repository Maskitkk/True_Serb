uniform sampler2D tDiffuse;
uniform float blurAmount;
varying vec2 vUv;

void main() {
    vec4 color = vec4(0.0);
    float total = 0.0;
    
    // Размер шага для размытия
    vec2 texelSize = vec2(1.0 / 500.0);
    float radius = 2.0 * blurAmount;
    
    // Гауссово размытие
    for(float x = -radius; x <= radius; x += 1.0) {
        for(float y = -radius; y <= radius; y += 1.0) {
            vec2 offset = vec2(x, y) * texelSize;
            float weight = exp(-(x*x + y*y) / (2.0 * radius * radius));
            color += texture2D(tDiffuse, vUv + offset) * weight;
            total += weight;
        }
    }
    
    gl_FragColor = color / total;
} 