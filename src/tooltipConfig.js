// Config map: "<category>/<type>" → { title, fields: [ordered list of keys to show] }
// Add more entries as you decide the exact fields for each type.
export const TOOLTIP_CONFIG = {
  // Emerging Tech
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

  // You can add more as you provide schemas/field lists, e.g.:
  // 'consumer/broadband': {
  //   title: 'Broadband',
  //   fields: [
  //     'incidentId', 'city', 'lat', 'lng',
  //     'serviceIssue.accountId',
  //     'serviceIssue.issue',
  //     'serviceIssue.downstreamMbps',
  //     'serviceIssue.expectedMbps',
  //     'ts'
  //   ]
  // },
};
