import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

interface MapData {
  states: any;
  counties: any;
  nation: any;
}

const USMap: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<MapData | null>(null);
  const [selectedState, setSelectedState] = useState<any | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string, x: number, y: number, visible: boolean }>({
    text: '', x: 0, y: 0, visible: false
  });

  const width = window.innerWidth;
  const height = window.innerHeight;

  useEffect(() => {
    // Fetch US Atlas data
    d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json').then((us: any) => {
      setData({
        states: topojson.feature(us, us.objects.states),
        counties: topojson.feature(us, us.objects.counties),
        nation: topojson.feature(us, us.objects.nation),
      });
    });
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const projection = d3.geoAlbersUsa()
      .scale(width * 1.3)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Initial render of states
    const states = g.append('g')
      .attr('class', 'states-group')
      .selectAll('path')
      .data((data.states as any).features)
      .enter().append('path')
      .attr('d', path as any)
      .attr('class', 'state')
      .on('mouseenter', function (event, d: any) {
        if (selectedState) return;
        setTooltip({
          text: d.properties.name,
          x: event.pageX,
          y: event.pageY - 40,
          visible: true
        });
      })
      .on('mousemove', function (event) {
        if (selectedState) return;
        setTooltip(prev => ({ ...prev, x: event.pageX, y: event.pageY - 40 }));
      })
      .on('mouseleave', () => setTooltip(prev => ({ ...prev, visible: false })))
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedState(d);
      });

    // Nation boundary
    g.append('path')
      .datum(data.nation)
      .attr('class', 'mesh')
      .attr('d', path as any)
      .style('pointer-events', 'none');

    // Handle background click to reset
    svg.on('click', () => setSelectedState(null));

    // Internal function to update map based on selectedState
    const updateMap = () => {
      if (selectedState) {
        const [[x0, y0], [x1, y1]] = path.bounds(selectedState);

        // Update state classes
        states.attr('class', (d: any) => d.id === selectedState.id ? 'state selected' : 'state');

        // Zoom transition
        svg.transition().duration(750).call(
          zoom.transform as any,
          d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
        );

        // Render counties
        g.selectAll('.counties-group').remove();

        const stateCounties = (data!.counties as any).features.filter((f: any) =>
          f.id.slice(0, 2) === selectedState.id
        );

        const countiesGroup = g.append('g')
          .attr('class', 'counties-group')
          .attr('opacity', 0);

        countiesGroup.selectAll('path')
          .data(stateCounties)
          .enter().append('path')
          .attr('d', path as any)
          .attr('class', 'county')
          .on('mouseenter', function (event, d: any) {
            setTooltip({
              text: d.properties.name,
              x: event.pageX,
              y: event.pageY - 40,
              visible: true
            });
          })
          .on('mousemove', function (event) {
            setTooltip(prev => ({ ...prev, x: event.pageX, y: event.pageY - 40 }));
          })
          .on('mouseleave', () => setTooltip(prev => ({ ...prev, visible: false })));

        countiesGroup.transition().duration(1000).attr('opacity', 1);
      } else {
        states.attr('class', 'state');
        g.selectAll('.counties-group').remove();

        svg.transition().duration(750).call(
          zoom.transform as any,
          d3.zoomIdentity
        );
      }
    };

    updateMap();

  }, [data, width, height, selectedState]);

  if (!data) return <div className="map-container"><div className="loading">Initializing Atlas...</div></div>;

  return (
    <div className="map-container">
      <div className="header">
        <h1>US Explorer</h1>
        <p>{selectedState ? `Exploring ${selectedState.properties.name}` : 'Select a state to view counties'}</p>
      </div>

      {selectedState && (
        <div className="controls">
          <button className="reset-button" onClick={() => setSelectedState(null)}>
            Back to US Map
          </button>
        </div>
      )}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: '100%' }}
      />

      <div
        className="tooltip"
        style={{
          opacity: tooltip.visible ? 1 : 0,
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translateX(-50%)'
        }}
      >
        {tooltip.text}
      </div>
    </div>
  );
};

export default USMap;
