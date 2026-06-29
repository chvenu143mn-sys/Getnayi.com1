import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface TagCloudItem {
  tag: string;
  score: number;
}

interface TagCloudProps {
  tags: TagCloudItem[];
  onTagClick: (tag: string) => void;
}

export function TagCloud({ tags, onTagClick }: TagCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || tags.length === 0) return;

    const width = containerRef.current.clientWidth || 300;
    const height = 240;

    // Clear previous
    d3.select(containerRef.current).selectAll('*').remove();

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Simple physics-based layout using force simulation instead of d3-cloud (to avoid requiring d3-cloud which isn't installed)
    const minScore = d3.min(tags, d => d.score) || 1;
    const maxScore = d3.max(tags, d => d.score) || 10;
    
    const sizeScale = d3.scaleLinear()
      .domain([minScore, maxScore])
      .range([12, 28]);
      
    // Force simulation
    const simulation = d3.forceSimulation(tags as any)
      .force('charge', d3.forceManyBody().strength(5)) // spread them out
      .force('center', d3.forceCenter(0, 0).strength(0.05))
      .force('collide', d3.forceCollide().radius((d: any) => sizeScale(d.score) * 2 + 10).iterations(10))
      .stop();

    for (let i = 0; i < 150; ++i) simulation.tick();
    
    // Process colors depending on score/size
    const colorScale = d3.scaleOrdinal()
      .domain(tags.map(d => d.tag))
      .range(['#a78bfa', '#818cf8', '#34d399', '#f472b6', '#60a5fa', '#93c5fd', '#c084fc', '#e879f9']);

    const nodes = svg.selectAll('text')
      .data(tags as any)
      .enter()
      .append('text')
      .style('font-size', (d: any) => `${sizeScale(d.score)}px`)
      .style('font-weight', 'bold')
      .style('fill', (d: any) => colorScale(d.tag) as string)
      .style('cursor', 'pointer')
      .style('transition', 'transform 0.2s, opacity 0.2s')
      .attr('text-brand-primarynchor', 'middle')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .text((d: any) => `#${d.tag.replace(/^#/, '')}`)
      .on('click', (event, d: any) => {
        const cleanTag = d.tag.replace(/^#/, '');
        onTagClick(cleanTag);
      })
      .on('mouseover', function(this: SVGTextElement) {
        d3.select(this)
          .style('opacity', 0.8)
          .attr('transform', (d: any) => `translate(${d.x},${d.y}) scale(1.1)`);
      })
      .on('mouseout', function(this: SVGTextElement) {
        d3.select(this)
          .style('opacity', 1)
          .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });
      
  }, [tags, onTagClick]);

  return <div ref={containerRef} className="w-full relative overflow-hidden" />;
}
