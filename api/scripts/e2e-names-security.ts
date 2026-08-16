import { fail, goodNamesBundle, pass, req, type NamesBundle } from './e2e-names-lib';

export async function runNamesSecurityChecks(
  superToken: string,
  goodBundle: NamesBundle = goodNamesBundle(),
) {
  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'http://evil.example/pack.json',
        },
      },
    });
    r.status === 400
      ? pass('reject_http_remote')
      : fail('reject_http_remote', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'javascript:alert(1)',
        },
      },
    });
    r.status === 400
      ? pass('reject_js_remote')
      : fail('reject_js_remote', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        frames: [
          {
            id: 'bad_affix',
            label: 'Bad',
            prefix: 'X'.repeat(40),
            suffix: '',
            premium: false,
            enabled: true,
          },
        ],
      },
    });
    r.status === 400
      ? pass('reject_long_prefix')
      : fail('reject_long_prefix', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        fonts: [
          { id: 'normal', label: 'Caps', sample: 'GHOST', enabled: false },
        ],
      },
    });
    r.status === 400
      ? pass('reject_no_font')
      : fail('reject_no_font', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: { ...goodBundle.policy, maxNameChars: 99 },
      },
    });
    r.status === 400
      ? pass('reject_max_chars_over_ff')
      : fail('reject_max_chars_over_ff', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'data:text/html,xss',
        },
      },
    });
    r.status === 400
      ? pass('reject_data_remote')
      : fail('reject_data_remote', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'file:///etc/passwd',
        },
      },
    });
    r.status === 400
      ? pass('reject_file_remote')
      : fail('reject_file_remote', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'https://169.254.169.254/latest/meta-data/',
        },
      },
    });
    r.status === 400
      ? pass('reject_link_local_remote')
      : fail('reject_link_local_remote', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'https://user:pass@example.com/pack.json',
        },
      },
    });
    r.status === 400
      ? pass('reject_remote_credentials')
      : fail('reject_remote_credentials', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/names/catalog');
    const leaked =
      r.json?.policy?.remotePackUrl !== undefined ||
      r.json?.policy?.remotePackEnabled !== undefined;
    !leaked && r.status === 200
      ? pass('public_no_admin_remote_fields')
      : fail('public_no_admin_remote_fields', JSON.stringify(r.json?.policy));
  }
}
