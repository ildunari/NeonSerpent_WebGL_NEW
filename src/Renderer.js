class Renderer {
    constructor(gl, canvas) {
        console.log('Renderer constructor called');
        this.gl = gl;
        this.canvas = canvas;
        // Initialize rendering-related variables here
        this.shaderProgram = null;
        this.triangleVertexBuffer = null; // Add buffer property
        this.positionAttributeLocation = -1; // Add attribute location property

        // Example vertices for a triangle in NDC
        this.triangleVertices = new Float32Array([
           -0.5, -0.5,  // Vertex 1 (x, y)
            0.5, -0.5,  // Vertex 2 (x, y)
            0.0,  0.5   // Vertex 3 (x, y)
        ]);
    }

    async init() {
        console.log('Renderer init called');

        // Load shader source code
        const vsSource = await this.loadShaderSource('/src/shaders/serpent.vert');
        const fsSource = await this.loadShaderSource('/src/shaders/serpent.frag');

        if (!vsSource || !fsSource) {
            throw new Error('Failed to load shader source.');
        }

        // Compile shaders
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);

        if (!vertexShader || !fragmentShader) {
            throw new Error('Failed to compile shaders.');
        }

        // Link shader program
        this.shaderProgram = this.linkProgram(vertexShader, fragmentShader);

        if (!this.shaderProgram) {
            throw new Error('Failed to link shader program.');
        }

        // Clean up shaders after linking
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);

        // Set initial GL state
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black background
        // Re-enable depth testing
        this.gl.enable(this.gl.DEPTH_TEST); // Enable depth testing
        this.gl.depthFunc(this.gl.LEQUAL); // Near things obscure far things

        // --- Setup for drawing the triangle ---

        const gl = this.gl;

        // Get location of the 'a_position' attribute in the shader program
        this.positionAttributeLocation = gl.getAttribLocation(this.shaderProgram, 'a_position');
        if (this.positionAttributeLocation < 0) { // -1 indicates not found
            throw new Error("Failed to get the storage location of 'a_position'. Is it defined and used in the vertex shader?");
        }

        // Create buffer
        this.triangleVertexBuffer = gl.createBuffer();
        if (!this.triangleVertexBuffer) {
            throw new Error('Failed to create vertex buffer.');
        }

        // Bind buffer (make it the active buffer)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexBuffer);

        // Buffer data (copy vertices into the active buffer)
        gl.bufferData(gl.ARRAY_BUFFER, this.triangleVertices, gl.STATIC_DRAW);

        // Tell WebGL how to pull data out of the buffer for the attribute
        const numComponents = 2; // x, y
        const type = gl.FLOAT;    // Data type
        const normalize = false;  // Don't normalize
        const stride = 0;         // 0 = move forward size * numComponents each iteration
        const offset = 0;         // Start at the beginning of the buffer
        gl.vertexAttribPointer(
            this.positionAttributeLocation,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );

        // Enable the vertex attribute array
        gl.enableVertexAttribArray(this.positionAttributeLocation);

        // Unbind buffer (optional but good practice)
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        console.log('Renderer initialized successfully.');
    }

    async loadShaderSource(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Could not load shader from ${url}:`, error);
            return null;
        }
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    linkProgram(vertexShader, fragmentShader) {
        const gl = this.gl;
        const shaderProgram = gl.createProgram();

        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            gl.deleteProgram(shaderProgram);
            return null;
        }

        return shaderProgram;
    }


    render(deltaTime) {
        // console.log('Renderer render called with deltaTime:', deltaTime);
        // Clear the canvas and draw game elements
        if (!this.gl || !this.shaderProgram) return;

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // Use our shader program
        this.gl.useProgram(this.shaderProgram);

        // Bind the buffer (necessary before drawing if other buffers might be used)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.triangleVertexBuffer);

        // Ensure the attribute is enabled (might be redundant if only one object, but good practice)
        // Note: vertexAttribPointer setup is usually done once in init unless switching VAOs/layouts
        this.gl.enableVertexAttribArray(this.positionAttributeLocation);

        // Re-specify pointer in case buffer binding changed (safer for complex scenes)
        this.gl.vertexAttribPointer(this.positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);


        // Draw the triangle
        const primitiveType = this.gl.TRIANGLES;
        const drawOffset = 0;
        const vertexCount = 3; // We have 3 vertices for our triangle
        this.gl.drawArrays(primitiveType, drawOffset, vertexCount);

        // Optional: Unbind buffer after drawing
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }

    resize(width, height) {
        console.log('Renderer resize called with dimensions:', width, height);
        // Update GL viewport and potentially projection matrices
        if (!this.gl) return;
        this.gl.viewport(0, 0, width, height);
        // Update projection matrix based on new dimensions later
    }
}

export default Renderer;
