/***
 *  rewrite prototype method
 * 
 ***/

THREE.Font.prototype.generateShapes = function(text, size) {
    if ( size === undefined ) size = 100;

    var shapes = [];
    var paths = createPaths( text, size, this.data );

    for ( var p = 0, pl = paths.length; p < pl; p ++ ) {

        Array.prototype.push.apply( shapes, paths[ p ].toShapes() );

    }

    return shapes;
}

function createPaths( text, size, data ) {

    var chars = Array.from ? Array.from( text ) : String( text ).split( '' );
    var scale = size / data.resolution;
    
    // add line-height
    var line_height = ( data.boundingBox.yMax - data.boundingBox.yMin + data.underlineThickness ) * scale * window.controls.lineHeight;

    var paths = [];

    var offsetX = 0, offsetY = 0;

    for ( var i = 0; i < chars.length; i ++ ) {

        var char = chars[ i ];

        if ( char === '\n' ) {

            offsetX = 0;
            offsetY -= line_height;

        } else {
            var ret = createPath( char, scale, offsetX, offsetY, char.charCodeAt(0) < 255 ? polyfill_font.data : data );
            offsetX += ret.offsetX;
            paths.push( ret.path );

        }

    }

    return paths;

}

function createPath( char, scale, offsetX, offsetY, data ) {

    var glyph = data.glyphs[ char ] || data.glyphs[ '?' ];

    if ( ! glyph ) {

        console.error( 'THREE.Font: character "' + char + '" does not exists in font family ' + data.familyName + '.' );

        return;

    }

    var path = new THREE.ShapePath();

    var x, y, cpx, cpy, cpx1, cpy1, cpx2, cpy2;

    if ( glyph.o ) {

        var outline = glyph._cachedOutline || ( glyph._cachedOutline = glyph.o.split( ' ' ) );
        var result = [];

        for ( var i = 0, l = outline.length; i < l; ) {

            var action = outline[ i ++ ];

            switch ( action ) {

                case 'm': // moveTo

                    x = outline[ i ++ ] * scale + offsetX;
                    y = outline[ i ++ ] * scale + offsetY;

                    path.moveTo( x, y );

                    break;

                case 'l': // lineTo

                    x = outline[ i ++ ] * scale + offsetX;
                    y = outline[ i ++ ] * scale + offsetY;

                    path.lineTo( x, y );

                    break;

                case 'q': // quadraticCurveTo

                    cpx = outline[ i ++ ] * scale + offsetX;
                    cpy = outline[ i ++ ] * scale + offsetY;
                    cpx1 = outline[ i ++ ] * scale + offsetX;
                    cpy1 = outline[ i ++ ] * scale + offsetY;

                    path.quadraticCurveTo( cpx1, cpy1, cpx, cpy );

                    break;

                case 'b': // bezierCurveTo

                    cpx = outline[ i ++ ] * scale + offsetX;
                    cpy = outline[ i ++ ] * scale + offsetY;
                    cpx1 = outline[ i ++ ] * scale + offsetX;
                    cpy1 = outline[ i ++ ] * scale + offsetY;
                    cpx2 = outline[ i ++ ] * scale + offsetX;
                    cpy2 = outline[ i ++ ] * scale + offsetY;

                    path.bezierCurveTo( cpx1, cpy1, cpx2, cpy2, cpx, cpy );

                    break;
                case 'z':
                    // path.moveTo( 0, 0 );
                    break;

            }
        }
        // console.log(path);
        // 0-9 9-14 14-31 31-36 36-41 41

    }
    // path.subPaths = path.subPaths.slice(-1);
    // add letter-space
    return { offsetX: glyph.ha * scale * window.controls.letterSpace, path: path };

}

function removeDupEndPts( points ) {

	var l = points.length;

	if ( l > 2 && points[ l - 1 ].equals( points[ 0 ] ) ) {

		points.pop();

	}

}

var oldTriangulateShape = THREE.ShapeUtils.triangulateShape;
THREE.ShapeUtils.triangulateShape = function(cs, holes) {

    removeDupEndPts( cs );

    var faces = oldTriangulateShape(cs, holes);
    var contours = [cs, ...holes];

    var triangles = triangulate(contours.map(contour => new Float32Array(contour.map(v => [v.x, v.y]).flat())));

    function isEqual(a, b) {
        return Math.abs(a - b) < 0.3;
    }

    // 1. recover vertex index
    // 2. calculate three vertexes in face
    var flat_contour = contours.flat();
    var face = [];
    var faces = [];
    for( var i = 0; i < triangles.length; i += 2) {
        var t1 = triangles[i];
        var t2 = triangles[i + 1];

        var index = flat_contour.findIndex(v => isEqual(v.x, t1) && isEqual(v.y, t2));
        if (index < 0) {
            console.error("can't find vertex index", t1, t2);
        } else {
            face.push(index);
            if (face.length === 3) {
                faces.push(face);
                face = [];
            }
        }
    }
    return faces;
}

THREE.ShapePath.prototype.toShapes = function ( isCCW, noHoles ) {
    function toShapesNoHoles( inSubpaths ) {

        var shapes = [];

        for ( var i = 0, l = inSubpaths.length; i < l; i ++ ) {

            var tmpPath = inSubpaths[ i ];

            var tmpShape = new Shape();
            tmpShape.curves = tmpPath.curves;

            shapes.push( tmpShape );

        }

        return shapes;

    }

    var isClockWise = THREE.ShapeUtils.isClockWise;

    var subPaths = this.subPaths;
    if ( subPaths.length === 0 ) { return []; }

    if ( noHoles === true )	{ return	toShapesNoHoles( subPaths ); }


    var solid, tmpPath, tmpShape, shapes = [];

    if ( subPaths.length === 1 ) {

        tmpPath = subPaths[ 0 ];
        tmpShape = new THREE.Shape();
        tmpShape.curves = tmpPath.curves;
        shapes.push( tmpShape );
        return shapes;

    }

    var holesFirst = !isClockWise( subPaths[ 0 ].getPoints() );
    holesFirst = isCCW ? ! holesFirst : holesFirst;

    // console.log("Holes first", holesFirst);

    var betterShapeHoles = [];
    var newShapes = [];
    var newShapeHoles = [];
    var mainIdx = 0;
    var tmpPoints;

    newShapes[ mainIdx ] = undefined;
    newShapeHoles[ mainIdx ] = [];

    for ( var i = 0, l = subPaths.length; i < l; i ++ ) {

        tmpPath = subPaths[ i ];
        tmpPoints = tmpPath.getPoints();
        solid = isClockWise( tmpPoints );
        solid = isCCW ? ! solid : solid;

        if ( mainIdx == 0 ) {
            newShapes[ mainIdx ] = { s: new THREE.Shape(), p: tmpPoints };
            newShapes[ mainIdx ].s.curves = tmpPath.curves;
            newShapeHoles[ mainIdx ] = [];
            mainIdx++;
            //console.log('cw', i);

        } else {
            newShapeHoles[ 0 ].push( { h: tmpPath, p: tmpPoints[ 0 ] } );

            //console.log('ccw', i);

        }

    }

    var tmpHoles;

    for ( var i = 0, il = newShapes.length; i < il; i ++ ) {

        tmpShape = newShapes[ i ].s;
        shapes.push( tmpShape );
        tmpHoles = newShapeHoles[ i ];

        for ( var j = 0, jl = tmpHoles.length; j < jl; j ++ ) {

            tmpShape.holes.push( tmpHoles[ j ].h );

        }

    }

    // console.log("shape", shapes);

    return shapes;
}