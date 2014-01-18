/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global require, define, brackets: true, $, window, navigator , clearInterval , setInterval*/

define(['d3', 'utils/utils'], function (d3, _util) {

    "use strict";

    function render(data, canvas) {


        var canvasWidth = 1333.33, //$(canvas).width(),
            canvasHeight = 1000, // $(canvas).height();
            paddingleft = 100, //for label
            paddingBottom = 70,
            plotMap = [],
            horizontals = [],
            allMonthCounts = [],
            allCounts = [],
            tags = Object.keys(data.map);


        Object.keys(data.map).sort().forEach(function (tagName) {

            var oneRowData = {},
                totalCount = {};

            data.map[tagName].forEach(function (row) {
                oneRowData[row.time] = [row.count];
                allMonthCounts.push(row.count);
            });

            Object.keys(oneRowData).reduce(function getGrowth(a, b, i) {
                if (i === 1) {
                    oneRowData[a].push(oneRowData[a][0]);
                    oneRowData[a].push(0);
                }
                oneRowData[b].push((+oneRowData[a][1] + (+oneRowData[b][0])));


                if (oneRowData[a][0] === 0) {
                    oneRowData[b].push(0);
                } else {
                    oneRowData[b].push(((oneRowData[b][0] - oneRowData[a][0]) / oneRowData[a][0]) * 100);

                }

                return b;
            });

            // get all total count
            allCounts.push((oneRowData[Object.keys(oneRowData)[Object.keys(oneRowData).length - 1]][1]));

            horizontals.push(tagName);
            plotMap.push({
                name: tagName,
                countData: oneRowData,
                totalCount: totalCount
            });

        });

        var monthData = Object.keys(plotMap[0].countData);
        //monthData.sort(sortYearData);

        var gridWidth = canvasWidth - paddingleft,
            gridHeight = canvasHeight - paddingBottom,
            spacing = gridWidth / tags.length;


        var Chart = d3.select(canvas).append("svg");
        Chart.attr("viewBox", "0 0 " + canvasWidth + " " + canvasHeight)
            .attr("preserveAspectRatio", "xMidYMid");

        var maxCount = d3.max(allMonthCounts),
            minCount = d3.min(allMonthCounts),
            maxTotal = d3.max(allCounts),
            getPosition = d3.scale.linear().domain([minCount, maxCount]).range([0, gridHeight]),
            getRadius = d3.scale.linear().domain([0, maxTotal]).range([3, 30]),
            getColorScale = d3.scale.category20(),
            colorList = _util.getTagColors();

        //add colors ids
        Object.keys(colorList).forEach(function (tag) {
            _util.addGradient(Chart.selectAll("svg")[0].parentNode, tag, colorList[tag].split(','));

        });

        function getColor(nameOrindex) {
            var name = typeof nameOrindex === 'string' ? nameOrindex : tags[nameOrindex];
            return Object.keys(colorList).indexOf(name) > -1 ? "url(#grad-" + name + ")" : getColorScale(nameOrindex);
        }


        //Bg
        Chart.append('rect')
            .attr("width", canvasWidth)
            .attr("height", gridHeight).style('fill', '#000');

        //Bg left
        /*Chart.append('rect')
            .attr("width", paddingleft)
            .attr("height", gridHeight).style('fill', '#220022');*/

        //Bg bottom
        var bottomPanel = Chart.append('g').attr("transform", "translate(0," + gridHeight + ")");
        bottomPanel.append('rect')
            .attr("width", canvasWidth)
            .attr("height", paddingBottom).style('fill', '#2E062E');

        var grid = Chart.append('g').attr("class", "gridWrapper").attr("transform", "translate(" + paddingleft + ",0)");


        var currentMonth = 0;

        var circles = grid.selectAll('.tags')
            .data(plotMap)
            .enter()
            .append('circle')
            .attr("class", "tags")
            .attr("r", 0)
            .attr("cx", function (d, i) {
                return i * spacing;
            })
            .attr("cy", gridHeight)
            .style("fill", function (d) {
                return getColor(d.name);
            })
            .on('mouseover', function (data) {
                var x = d3.select(this).attr("cx") - d3.select(this).attr("r") + paddingBottom,
                    y = d3.select(this).attr("cy") - d3.select(this).attr("r");
                label.text(data.name)
                    .attr("transform", "translate(" + x + "," + y + ")")
                    .transition()
                    .duration(300)
                    .style('opacity', 1);
            })
            .on('mouseout', function () {
                label.text('').style('opacity', 0);
            });

        var label = Chart.append('text').attr('class', 'tag-label').style("fill", "rgb(37, 228, 167)");
        var monthLabel = Chart.append('text')
            .attr('class', 'month-label')
            .style("font-size", "70px")
            .attr("transform", "translate(75,300) rotate(-90)");

        var line = grid.append("line")
            .attr("x1", -paddingleft)
            .attr("y1", gridHeight)
            .attr("x2", gridWidth)
            .attr("y2", gridHeight)
            .attr("stroke-width", 1)
            .attr("stroke", "rgba(37, 228, 167, .5)");

        var maxCountLabel = bottomPanel.append('text')
            .attr('class', 'maxcount-label')
            .style("font-size", "30px")
            .attr("transform", "translate(100,45)");

        maxCountLabel.append('tspan').text('Highest number of questions  ');
        maxCountLabel.append('tspan').text('   count : ').style("font-size", "20px");
        maxCountLabel.append('tspan').attr('class', 'max-count').text(0);
        maxCountLabel.append('tspan').text('  date : ').style("font-size", "20px");
        maxCountLabel.append('tspan').attr('class', 'max-month').text('12');
        maxCountLabel.append('tspan').text('  tag : ').style("font-size", "20px");
        maxCountLabel.append('tspan').attr('class', 'max-tag').text('javascript');



        var maxData = {
            maxCount: 0
        };

        function moveTag() {

            if (currentMonth >= monthData.length) {
                clearInterval(animate);
                currentMonth = 0;
                maxData.write = true;
                return;
            }

            var month = monthData[currentMonth];
            var positions = [],
                maxCountOfMonth = 0,
                tagOfMonth = '';

            monthLabel.text(new Date(+month).getMonth() + 1 + " / " + new Date(+month).getFullYear());

            circles.each(function (tag) {
                var count = tag.countData[month][0],
                    total = tag.countData[month][1],
                    pos = gridHeight - getPosition(count);

                if (count > maxCountOfMonth) {
                    maxCountOfMonth = count;
                    tagOfMonth = tag.name;

                    if (count > maxData.maxCount) {
                        maxData.maxCount = count;
                        maxData.tag = tagOfMonth;
                        maxData.month = new Date(+month).getMonth() + 1 + "/" + new Date(+month).getFullYear();
                    }

                }

                positions.push(pos);

                d3.select(this).transition()
                    .duration(400)
                    .attr("cy", pos)
                    .attr('r', getRadius(total));

            });

            currentMonth++;

            maxCountLabel.select('.max-count').text(maxData.maxCount);
            maxCountLabel.select('.max-month').text(maxData.month);
            maxCountLabel.select('.max-tag').text(maxData.tag);
            var maxPos = d3.min(positions);
            line.transition()
                .duration(300)
                .attr("x1", -paddingleft)
                .attr("y1", maxPos)
                .attr("x2", gridWidth)
                .attr("y2", maxPos);
        }

        var animate = setInterval(function () {
            moveTag();
        }, 300);

    }

    return render;

});
