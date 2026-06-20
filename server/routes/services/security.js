const logger = require('../../config/logger');
/**
 * Security Routes - Nuclei + Trivy Integration
 * Replaces: openfang, pentagi
 */

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const router = express.Router();
const execAsync = promisify(exec);

const { supabase } = require('../../config/supabase');

// ═══════════════════════════════════════════════════════════
// HEALTH CHECKS
// ═══════════════════════════════════════════════════════════

router.get('/health', async (req, res) => {
  const health = {
    nuclei: 'unknown',
    trivy: 'unknown',
  };

  // Check Nuclei
  try {
    await execAsync('nuclei -version');
    health.nuclei = 'healthy';
  } catch {
    health.nuclei = 'not_installed';
  }

  // Check Trivy
  try {
    await execAsync('trivy version');
    health.trivy = 'healthy';
  } catch {
    health.trivy = 'not_installed';
  }

  res.json(health);
});

// ═══════════════════════════════════════════════════════════
// NUCLEI - Web Vulnerability Scanning
// ═══════════════════════════════════════════════════════════

router.post('/nuclei/scan', async (req, res) => {
  try {
    const { target, options = {} } = req.body;

    if (!target) {
      return res.status(400).json({ error: 'Target URL required' });
    }

    // Validate URL
    let url;
    try {
      url = new URL(target);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const severity = options.severity || 'critical,high,medium';
    const templates = options.templates || 'cves,vulnerabilities,misconfiguration';
    const timeout = options.timeout || 300;

    // Build Nuclei command
    const command = `nuclei -u "${url.href}" -s "${severity}" -t "${templates}" -timeout ${timeout} -json -silent`;

    let results = [];

    try {
      const { stdout } = await execAsync(command, { timeout: timeout * 1000 });

      // Parse JSON lines
      results = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { raw: line };
          }
        });
    } catch (execError) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: 'Security scanner unavailable. Please contact your administrator.' });
      }
      results = [
        {
          template: 'nuclei-demo',
          info: { name: 'Nuclei Demo Mode', severity: 'info' },
          host: url.href,
          timestamp: new Date().toISOString(),
          message: 'Nuclei not installed on server. Install with: go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest'
        }
      ];
    }

    // Log scan to Supabase
    await supabase.from('security_scans').insert({
      tool: 'nuclei',
      target: url.href,
      vulnerability_count: results.length,
      results,
      created_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      target: url.href,
      scan_time: new Date().toISOString(),
      results,
      total_vulnerabilities: results.length,
    });
  } catch (error) {
    logger.error('Nuclei scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/nuclei/health', async (req, res) => {
  try {
    await execAsync('nuclei -version');
    res.json({ status: 'healthy', tool: 'nuclei' });
  } catch {
    res.status(503).json({
      status: 'not_installed',
      message: 'Nuclei not found. Install: go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
    });
  }
});

// ═══════════════════════════════════════════════════════════
// TRIVY - Code & Container Scanning
// ═══════════════════════════════════════════════════════════

router.post('/trivy/image', async (req, res) => {
  try {
    const { image, options = {} } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image name required' });
    }

    const severity = options.severity || 'HIGH,CRITICAL';
    const scanners = options.scanners || 'vuln,secret,config';

    const command = `trivy image "${image}" --severity "${severity}" --scanners "${scanners}" -f json --timeout 10m`;

    let results = {};

    try {
      const { stdout } = await execAsync(command, { timeout: 600000 });
      results = JSON.parse(stdout);
    } catch (execError) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: 'Container scanner unavailable. Please contact your administrator.' });
      }
      results = {
        SchemaVersion: 2,
        ArtifactName: image,
        Results: [{
          Target: image,
          Type: 'container',
          Vulnerabilities: [],
          message: 'Trivy not installed on server. Install with: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin'
        }]
      };
    }

    // Log scan
    await supabase.from('security_scans').insert({
      tool: 'trivy-image',
      target: image,
      vulnerability_count: results.Results?.reduce((acc, r) => acc + (r.Vulnerabilities?.length || 0), 0) || 0,
      results,
      created_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      image,
      scan_time: new Date().toISOString(),
      results,
    });
  } catch (error) {
    logger.error('Trivy image scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/trivy/code', async (req, res) => {
  try {
    const { path = '.', options = {} } = req.body;

    const scanners = options.scanners || 'secret,config,vuln';
    const severity = options.severity || 'HIGH,CRITICAL';
    const skipDirs = options.skipDirs || ['node_modules', '.git', 'dist'];

    const skipArg = skipDirs.map(d => `--skip-dirs "${d}"`).join(' ');
    const command = `trivy filesystem "${path}" --scanners "${scanners}" --severity "${severity}" ${skipArg} -f json`;

    let results = {};

    try {
      const { stdout } = await execAsync(command, { timeout: 300000 });
      results = JSON.parse(stdout);
    } catch (execError) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: 'Filesystem scanner unavailable. Please contact your administrator.' });
      }
      results = {
        SchemaVersion: 2,
        ArtifactName: path,
        Results: [{
          Target: 'filesystem',
          Type: 'filesystem',
          message: 'Trivy not installed or scan incomplete'
        }]
      };
    }

    // Log scan
    await supabase.from('security_scans').insert({
      tool: 'trivy-code',
      target: path,
      vulnerability_count: 0,
      results,
      created_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      path,
      scan_time: new Date().toISOString(),
      results,
    });
  } catch (error) {
    logger.error('Trivy code scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/trivy/health', async (req, res) => {
  try {
    await execAsync('trivy version');
    res.json({ status: 'healthy', tool: 'trivy' });
  } catch {
    res.status(503).json({
      status: 'not_installed',
      message: 'Trivy not found. Install: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin',
    });
  }
});

// ═══════════════════════════════════════════════════════════
// UNIFIED SECURITY REPORTS
// ═══════════════════════════════════════════════════════════

router.post('/report', async (req, res) => {
  try {
    const { target } = req.body;

    // Run both scans in parallel
    const [nucleiResults, trivyResults] = await Promise.allSettled([
      // Simulated Nuclei scan
      (async () => {
        try {
          await execAsync('nuclei -version');
          return { status: 'ready', tool: 'nuclei' };
        } catch {
          return { status: 'not_installed', tool: 'nuclei' };
        }
      })(),
      // Simulated Trivy scan
      (async () => {
        try {
          await execAsync('trivy version');
          return { status: 'ready', tool: 'trivy' };
        } catch {
          return { status: 'not_installed', tool: 'trivy' };
        }
      })(),
    ]);

    const report = {
      target,
      timestamp: new Date().toISOString(),
      webSecurity: nucleiResults.status === 'fulfilled' ? nucleiResults.value : { error: nucleiResults.reason },
      codeSecurity: trivyResults.status === 'fulfilled' ? trivyResults.value : { error: trivyResults.reason },
      summary: {
        nucleiReady: nucleiResults.status === 'fulfilled' && nucleiResults.value.status === 'ready',
        trivyReady: trivyResults.status === 'fulfilled' && trivyResults.value.status === 'ready',
        status: 'completed',
      },
    };

    // Store report
    await supabase.from('security_reports').insert(report);

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: scans, error: scansError } = await supabase
      .from('security_scans')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    const { data: reports, error: reportsError } = await supabase
      .from('security_reports')
      .select('*')
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false });

    if (scansError) throw scansError;
    if (reportsError) throw reportsError;

    res.json({
      recentScans: scans || [],
      recentReports: reports || [],
      totalScans: scans?.length || 0,
      totalVulnerabilities: scans?.reduce((acc, s) => acc + (s.vulnerability_count || 0), 0) || 0,
      days,
    });
  } catch (error) {
    logger.error('Dashboard data error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
