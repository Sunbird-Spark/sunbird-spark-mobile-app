// Mock data for API responses

export const mockOrganizationResponse = {
  data: {
    id: 'api.org.search',
    ver: 'v2',
    ts: '2026-02-03 07:50:33:585+0000',
    params: {
      resmsgid: 'ae215943-8fec-430f-bd97-ec63c9719827',
      msgid: 'ae215943-8fec-430f-bd97-ec63c9719827',
      err: null,
      status: 'SUCCESS',
      errmsg: null
    },
    responseCode: 'OK',
    result: {
      response: {
        count: 1,
        content: [
          {
            isSSOEnabled: true,
            identifier: '0143635463018987520',
            orgName: 'Sunbird Org',
            channel: 'sunbird',
            description: 'Default Organisation for Sunbird',
            externalId: 'sunbird',
            rootOrgId: '0143635463018987520',
            organisationType: 5,
            isSchool: false,
            createdDate: '2025-07-24 12:53:05:952+0000',
            createdBy: '0f6d9d46-ec66-4664-81a7-deb1582ede95',
            provider: 'sunbird',
            isTenant: true,
            hashTagId: '0143635463018987520',
            id: '0143635463018987520',
            isBoard: true,
            slug: 'sunbird',
            status: 1
          }
        ]
      }
    }
  },
  status: 200,
  headers: {}
};

export const mockChannelResponse = {
  data: {
    id: 'api.channel.read',
    ver: '1.0',
    ts: '2026-02-03T05:38:15.045Z',
    params: {
      resmsgid: 'channel-msg-id',
      msgid: 'channel-msg-id',
      err: null,
      status: 'SUCCESS',
      errmsg: null
    },
    responseCode: 'OK',
    result: {
      channel: {
        identifier: '0143635463018987520',
        name: 'Sunbird',
        description: 'Sunbird Channel',
        code: 'sunbird',
        slug: 'sunbird',
        frameworks: [
          {
            identifier: 'NCF',
            name: 'State (Uttar Pradesh)',
            objectType: 'Framework'
          }
        ],
        hashTagId: '0143635463018987520',
        status: 1
      }
    }
  },
  status: 200,
  headers: {}
};

export const mockContentResponse = {
  data: {
    id: 'api.content.search',
    ver: '1.0',
    ts: '2026-02-03T05:38:12.045Z',
    params: {
      resmsgid: 'content-msg-id',
      msgid: 'content-msg-id',
      err: null,
      status: 'SUCCESS',
      errmsg: null
    },
    responseCode: 'OK',
    result: {
      count: 2,
      content: [
        {
          identifier: 'do_123456789',
          name: 'Sample Course 1',
          description: 'This is a sample course',
          contentType: 'Course',
          status: 'Live',
          framework: 'NCF',
          channel: 'sunbird'
        },
        {
          identifier: 'do_987654321',
          name: 'Sample Course 2',
          description: 'This is another sample course',
          contentType: 'Course',
          status: 'Live',
          framework: 'NCF',
          channel: 'sunbird'
        }
      ]
    }
  },
  status: 200,
  headers: {}
};

export const mockFrameworkResponse = {
  data: {
    id: 'api.framework.read',
    ver: '1.0',
    ts: '2026-02-03T05:38:14.605Z',
    params: {
      resmsgid: 'framework-msg-id',
      msgid: 'framework-msg-id',
      err: null,
      status: 'SUCCESS',
      errmsg: null
    },
    responseCode: 'OK',
    result: {
      framework: {
        identifier: 'NCF',
        name: 'State (Uttar Pradesh)',
        description: 'NCF Framework',
        code: 'NCF',
        categories: [
          {
            identifier: 'ncf_board',
            code: 'board',
            name: 'Board',
            description: 'Board',
            index: 1,
            status: 'Live'
          },
          {
            identifier: 'ncf_medium',
            code: 'medium',
            name: 'Medium',
            description: 'Medium',
            index: 2,
            status: 'Live'
          }
        ],
        type: 'K-12',
        objectType: 'Framework'
      }
    }
  },
  status: 200,
  headers: {}
};

export const mockSystemSettingResponse = {
  data: {
    id: 'api.system.settings.get.sunbird',
    ver: 'v1',
    ts: '2026-02-03 06:11:20:670+0000',
    params: {
      resmsgid: '517c002a-9a94-4e3e-83fe-b283a49a3d49',
      msgid: '517c002a-9a94-4e3e-83fe-b283a49a3d49',
      err: null,
      status: 'SUCCESS',
      errmsg: null
    },
    responseCode: 'OK',
    result: {
      response: {
        id: 'sunbird',
        field: 'sunbird',
        value: 'sunbird'
      }
    }
  },
  status: 200,
  headers: {}
};

export const mockApiError = {
  message: 'API Error',
  status: 500,
  data: {
    id: 'api.error',
    ver: '1.0',
    ts: '2026-02-03T05:38:15.045Z',
    params: {
      resmsgid: 'error-msg-id',
      msgid: 'error-msg-id',
      err: 'INTERNAL_ERROR',
      status: 'FAILED',
      errmsg: 'Internal server error'
    },
    responseCode: 'SERVER_ERROR',
    result: {}
  }
};