// src/tooltipConfig.js
// Config map: "<category>/<type>" → { title, fields: [ordered keys] }
// Keys support deep paths like "serviceIssue.deviceId".
// Titles are what appears in bold at the top of the tooltip.

export const TOOLTIP_CONFIG = {
  // -------------------------
  // Emerging Tech (already validated)
  // -------------------------
  'emerging_tech/satellite': {
    title: 'Satellite',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.terminalId',
      'serviceIssue.issue',
      'serviceIssue.snrDb',
      'ts'
    ]
  },
  'emerging_tech/iot': {
    title: 'IoT',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.deviceId',
      'serviceIssue.issue',
      'serviceIssue.fleet',
      'serviceIssue.region',
      'ts'
    ]
  },
  'emerging_tech/smart-city': {
    title: 'Smart City',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.sensorId',
      'serviceIssue.issue',
      'serviceIssue.location',
      'ts'
    ]
  },

  // -------------------------
  // Consumer
  // -------------------------
  // Example broadband schema seen earlier:
  // { accountId, issue, downstreamMbps, expectedMbps }
  'consumer/broadband': {
    title: 'Broadband',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.accountId',
      'serviceIssue.issue',
      'serviceIssue.downstreamMbps',
      'serviceIssue.expectedMbps',
      'ts'
    ]
  },
  // Fiber assumptions: ONT metrics + light level/readiness
  'consumer/fiber': {
    title: 'Fiber',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.accountId',
      'serviceIssue.ontId',
      'serviceIssue.issue',
      'serviceIssue.lightLevelDbm',
      'serviceIssue.distanceMeters',
      'ts'
    ]
  },
  // 5G assumptions: common RF metrics + sector/cell identifiers
  'consumer/5g': {
    title: '5G',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.cellId',
      'serviceIssue.sector',
      'serviceIssue.band',
      'serviceIssue.pci',
      'serviceIssue.rsrpDbm',
      'serviceIssue.rsrqDb',
      'serviceIssue.sinrDb',
      'serviceIssue.issue',
      'ts'
    ]
  },
  // Wi-Fi hotspot assumptions: AP identity + clients + backhaul
  'consumer/wifi-hotspot': {
    title: 'Wi-Fi Hotspot',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.ssid',
      'serviceIssue.apMac',
      'serviceIssue.connectedClients',
      'serviceIssue.backhaulMbps',
      'serviceIssue.issue',
      'ts'
    ]
  },
  // Wireless (catch-all mobile) assumptions: tower/sector + RF
  'consumer/wireless': {
    title: 'Wireless',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.towerId',
      'serviceIssue.sector',
      'serviceIssue.rsrpDbm',
      'serviceIssue.rsrqDb',
      'serviceIssue.sinrDb',
      'serviceIssue.issue',
      'ts'
    ]
  },

  // -------------------------
  // Federal
  // -------------------------
  // Public Safety assumptions: agency + unit + incident code/priority
  'federal/public-safety': {
    title: 'Public Safety',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.agency',
      'serviceIssue.unitId',
      'serviceIssue.incidentCode',
      'serviceIssue.priority',
      'serviceIssue.issue',
      'ts'
    ]
  },
  // Government assumptions: agency/department + ticketing
  'federal/government': {
    title: 'Government',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.agency',
      'serviceIssue.department',
      'serviceIssue.ticketId',
      'serviceIssue.issue',
      'ts'
    ]
  },
  // FirstNet assumptions: device/SIM + priority profile
  'federal/firstnet': {
    title: 'FirstNet',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.deviceId',
      'serviceIssue.simId',
      'serviceIssue.priorityLevel',
      'serviceIssue.issue',
      'ts'
    ]
  },

  // -------------------------
  // Infrastructure
  // -------------------------
  // Construction assumptions: permit/crew + status/ETA
  'infrastructure/construction': {
    title: 'Construction',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.permitId',
      'serviceIssue.crewId',
      'serviceIssue.status',
      'serviceIssue.expectedCompletion',
      'serviceIssue.issue',
      'ts'
    ]
  },
  // Smartcell assumptions: small cell/node health + power/backhaul
  'infrastructure/smartcell': {
    title: 'Smartcell',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.nodeId',
      'serviceIssue.status',
      'serviceIssue.backhaulType',
      'serviceIssue.powerStatus',
      'serviceIssue.issue',
      'ts'
    ]
  },
  // Backhaul assumptions: link health + performance KPIs
  'infrastructure/backhaul': {
    title: 'Backhaul',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.linkId',
      'serviceIssue.capacityMbps',
      'serviceIssue.utilizationPct',
      'serviceIssue.latencyMs',
      'serviceIssue.jitterMs',
      'serviceIssue.packetLossPct',
      'serviceIssue.issue',
      'ts'
    ]
  },
  // Datacenter assumptions: site/rack + power/temp/status
  'infrastructure/datacenter': {
    title: 'Datacenter',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.dcId',
      'serviceIssue.rack',
      'serviceIssue.powerKw',
      'serviceIssue.tempC',
      'serviceIssue.status',
      'serviceIssue.issue',
      'ts'
    ]
  },
  // Cloud network assumptions: region/VPC/Subnet + throughput/status
  'infrastructure/cloud-network': {
    title: 'Cloud Network',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.provider',
      'serviceIssue.region',
      'serviceIssue.vpcId',
      'serviceIssue.subnetId',
      'serviceIssue.throughputGbps',
      'serviceIssue.status',
      'serviceIssue.issue',
      'ts'
    ]
  },
  // Edge site assumptions: site health + resource usage
  'infrastructure/edge': {
    title: 'Edge',
    fields: [
      'incidentId',
      'city',
      'lat',
      'lng',
      'serviceIssue.edgeSiteId',
      'serviceIssue.cpuPct',
      'serviceIssue.memPct',
      'serviceIssue.diskPct',
      'serviceIssue.tempC',
      'serviceIssue.status',
      'serviceIssue.issue',
      'ts'
    ]
  }
};
