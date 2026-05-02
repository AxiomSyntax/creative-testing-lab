import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ProjectProvider, useProject } from "@/contexts/ProjectContext";
import { SaveStatusProvider } from "@/contexts/SaveStatusContext";

// Pages
import Home from "@/pages/home";
import Framework from "@/pages/framework";
import MarketUnderstanding from "@/pages/market-understanding";
import CompetitorIntelligence from "@/pages/competitor-intelligence";
import ScriptTesting from "@/pages/script-testing";
import CreativeIteration from "@/pages/creative-iteration";
import HookLibrary from "@/pages/hook-library";
import FormatLibrary from "@/pages/format-library";
import StaticAdLibrary from "@/pages/static-ad-library";
import AngleLibrary from "@/pages/angle-library";
import AwarenessLevels from "@/pages/awareness-levels";
import CampaignStructure from "@/pages/campaign-structure";
import Hypothesis from "@/pages/hypothesis";
import CreativeLab from "@/pages/creative-lab";
import ExperimentBacklog from "@/pages/experiment-backlog";
import ExperimentTimeline from "@/pages/experiment-timeline";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// key={activeProjectId} forces all pages to fully remount on project switch,
// so every useLocalStorage hook re-initialises with the new project's keys.
function Router() {
  const { activeProjectId } = useProject();
  return (
    <Layout>
      <Switch key={activeProjectId}>
        <Route path="/" component={Home} />
        <Route path="/framework" component={Framework} />
        <Route path="/market-understanding" component={MarketUnderstanding} />
        <Route path="/competitor-intelligence" component={CompetitorIntelligence} />
        <Route path="/script-testing" component={ScriptTesting} />
        <Route path="/creative-iteration" component={CreativeIteration} />
        <Route path="/hook-library" component={HookLibrary} />
        <Route path="/format-library" component={FormatLibrary} />
        <Route path="/static-ad-library" component={StaticAdLibrary} />
        <Route path="/angle-library" component={AngleLibrary} />
        <Route path="/awareness-levels" component={AwarenessLevels} />
        <Route path="/campaign-structure" component={CampaignStructure} />
        <Route path="/hypothesis" component={Hypothesis} />
        <Route path="/creative-lab" component={CreativeLab} />
        <Route path="/experiment-backlog" component={ExperimentBacklog} />
        <Route path="/experiment-timeline" component={ExperimentTimeline} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProjectProvider>
          <SaveStatusProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </SaveStatusProvider>
        </ProjectProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
